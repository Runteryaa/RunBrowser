import { useThemeColor } from '@/hooks/useThemeColor';
import { Pause, Play } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface VideoPlayerProps {
  visible: boolean;
  videoUrl: string;
  title?: string;
  onClose: () => void;
  webViewRef: any;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  visible,
  videoUrl,
  title,
  onClose,
  webViewRef,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const controlsTimeout = useRef<number | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;

  const background = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const primaryColor = useThemeColor({}, 'primary');

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        mass: 1.2,
        stiffness: 100,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: Dimensions.get('window').height,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Hide controls after a delay
  useEffect(() => {
    if (controlsVisible && !isDragging) {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
      
      controlsTimeout.current = setTimeout(() => {
        Animated.timing(controlsOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setControlsVisible(false);
        });
      }, 3000);
    }
    
    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, [controlsVisible, isDragging]);
  
  // Update progress animation when currentTime changes
  useEffect(() => {
    if (duration > 0) {
      Animated.timing(progressAnim, {
        toValue: currentTime / duration,
        duration: 0,
        useNativeDriver: false,
      }).start();
    }
  }, [currentTime, duration]);
  
  // Show controls when tapped
  const handleTap = () => {
    if (!controlsVisible) {
      setControlsVisible(true);
      Animated.timing(controlsOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(controlsOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setControlsVisible(false);
      });
    }
  };
  
  const handleVideoCommand = (command: string) => {
    if (webViewRef.current) {
      const script = `
        const video = document.querySelector('video[src="${videoUrl}"]');
        if (video) {
          video.${command}();
        }
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    const newState = !isPlaying;
    setIsPlaying(newState);
    handleVideoCommand(newState ? 'play' : 'pause');
  };
  
  // Toggle mute
  const toggleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    
    if (webViewRef.current) {
      const script = `
        document.querySelector('video').muted = ${newState};
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  };
  
  // Toggle fullscreen
  const toggleFullscreen = () => {
    // In a real implementation, you would handle the fullscreen mode here
    // For now, we'll just update the state
  };
  
  // Modified progress bar panResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => setIsDragging(true),
      onPanResponderMove: (_, gestureState) => {
        const progress = Math.max(0, Math.min(1, (gestureState.moveX - 16) / (Dimensions.get('window').width - 32)));
        Animated.timing(progressAnim, {
          toValue: progress,
          duration: 0,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderRelease: (_, gestureState) => {
        const progress = Math.max(0, Math.min(1, (gestureState.moveX - 16) / (Dimensions.get('window').width - 32)));
        if (webViewRef.current) {
          const script = `
            const video = document.querySelector('video[src="${videoUrl}"]');
            if (video) {
              video.currentTime = ${progress * duration};
            }
            true;
          `;
          webViewRef.current.injectJavaScript(script);
        }
        setIsDragging(false);
      },
    })
  ).current;

  // Format time (seconds) to MM:SS
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!visible) return null;

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          styles.playerContainer,
          {
            backgroundColor: 'black',
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Done</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {title || 'Video'}
          </Text>
          <View style={styles.closeButton} /> {/* Placeholder for symmetry */}
        </View>

        <Pressable style={styles.videoContainer} onPress={togglePlayPause}>
          <View style={styles.videoPlaceholder} />
          
          <TouchableOpacity
            style={[styles.playPauseButton, { opacity: controlsVisible ? 1 : 0 }]}
            onPress={togglePlayPause}
          >
            {isPlaying ? (
              <Pause size={40} color="white" />
            ) : (
              <Play size={40} color="white" />
            )}
          </TouchableOpacity>
        </Pressable>

        <View style={styles.controls}>
          <View style={styles.progressContainer} {...panResponder.panHandlers}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progress,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
  playerContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    width: 80,
  },
  closeText: {
    color: '#007AFF',
    fontSize: 17,
  },
  title: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  playPauseButton: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 40,
    padding: 12,
  },
  controls: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  progressContainer: {
    width: '100%',
  },
  progressBar: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    color: 'white',
    fontSize: 14,
  },
});

export default VideoPlayer;
