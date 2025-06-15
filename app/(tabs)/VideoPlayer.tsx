import { ResizeMode, Video } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Maximize2, Minimize2, Pause, Play, Volume2, VolumeX } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface VideoPlayerProps {
  visible: boolean;
  videoUrl: string;
  title?: string;
  onClose: () => void;
  webViewRef: any;
}

const SEEK_SECONDS = 10;

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
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [doubleTapSide, setDoubleTapSide] = useState<'left' | 'right' | null>(null);

  const videoRef = useRef<any>(null);
  const controlsTimeout = useRef<number | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const insets = useSafeAreaInsets();

  // Orientation lock
  useEffect(() => {
    if (visible && isFullscreen) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } else if (visible) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, [visible, isFullscreen]);

  // Handle Android back button
  useEffect(() => {
    if (!visible) return;
    const onBack = () => {
      if (isFullscreen) {
        setIsFullscreen(false);
        return true;
      }
      onClose();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => subscription.remove();
  }, [visible, onClose, isFullscreen]);

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
    if (controlsVisible && !isDragging && isPlaying) {
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
  }, [controlsVisible, isDragging, isPlaying]);

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

  // Double-tap to seek
  let lastTap = useRef<number>(0);
  const handleDoubleTap = (side: 'left' | 'right') => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      seekBy(side === 'left' ? -SEEK_SECONDS : SEEK_SECONDS);
      setDoubleTapSide(side);
      setTimeout(() => setDoubleTapSide(null), 500);
    }
    lastTap.current = now;
  };

  // Toggle play/pause
  const togglePlayPause = async () => {
    const newState = !isPlaying;
    setIsPlaying(newState);
    if (videoRef.current) {
      if (newState) {
        await videoRef.current.playAsync();
      } else {
        await videoRef.current.pauseAsync();
      }
    }
    setControlsVisible(true);
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Toggle mute
  const toggleMute = async () => {
    const newState = !isMuted;
    setIsMuted(newState);
    if (videoRef.current) {
      await videoRef.current.setIsMutedAsync(newState);
    }
    setControlsVisible(true);
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Seek bar panResponder with thumb
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => setIsDragging(true),
      onPanResponderMove: (_, gestureState) => {
        const progress = Math.max(
          0,
          Math.min(1, (gestureState.moveX - 16) / (Dimensions.get('window').width - 32))
        );
        Animated.timing(progressAnim, {
          toValue: progress,
          duration: 0,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderRelease: async (_, gestureState) => {
        const progress = Math.max(
          0,
          Math.min(1, (gestureState.moveX - 16) / (Dimensions.get('window').width - 32))
        );
        if (videoRef.current && duration > 0) {
          await videoRef.current.setPositionAsync(progress * duration * 1000);
        }
        setIsDragging(false);
      },
    })
  ).current;

  // Tap-to-seek on progress bar
  const handleSeekBarPress = (e: any) => {
    const x = e.nativeEvent.locationX;
    const width = Dimensions.get('window').width - 32;
    const progress = Math.max(0, Math.min(1, x / width));
    if (videoRef.current && duration > 0) {
      videoRef.current.setPositionAsync(progress * duration * 1000);
    }
  };

  // Seek by seconds
  const seekBy = (seconds: number) => {
    let newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    if (videoRef.current) {
      videoRef.current.setPositionAsync(newTime * 1000);
    }
    setCurrentTime(newTime);
  };

  // Format time (seconds) to MM:SS or HH:MM:SS
  const formatTime = (timeInSeconds: number) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!visible) return null;

  return (
    <View style={styles.absoluteFill}>
      {/* Header always visible at the top, respecting safe area */}
      {!isFullscreen && (
        <View style={[styles.headerSafeArea, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            >
              <Text style={styles.closeText}>Done</Text>
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>
              {title || 'Video'}
            </Text>
            <View style={styles.closeButton} /> {/* Placeholder for symmetry */}
          </View>
        </View>
      )}
      {/* Animated player slides in below the header */}
      <Animated.View
        style={[
          styles.playerContainer,
          isFullscreen && styles.fullscreenPlayer,
          {
            backgroundColor: 'black',
            marginTop: isFullscreen ? 0 : insets.top + 56,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.flexRow}>
          {/* Double-tap left/right for seek */}
          <Pressable
            style={styles.doubleTapZoneLeft}
            onPress={() => handleDoubleTap('left')}
          >
            {doubleTapSide === 'left' && (
              <View style={styles.seekOverlay}>
                <Text style={styles.seekText}>{`⏪  ${SEEK_SECONDS}s`}</Text>
              </View>
            )}
          </Pressable>
          <Pressable style={styles.videoContainer} onPress={handleTap}>
            <Video
              ref={videoRef}
              source={{ uri: videoUrl }}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={isPlaying}
              isMuted={isMuted}
              onPlaybackStatusUpdate={status => {
                if (!status.isLoaded) {
                  setIsLoading(true);
                  return;
                }
                setIsLoading(false);
                if (typeof status.durationMillis === 'number') {
                  setDuration(status.durationMillis / 1000);
                }
                if (typeof status.positionMillis === 'number') {
                  setCurrentTime(status.positionMillis / 1000);
                }
                if (status.didJustFinish) onClose();
              }}
            />
            {/* Center Play Button Overlay */}
            {!isPlaying && !isLoading && (
              <TouchableOpacity
                style={styles.centerPlayButton}
                onPress={togglePlayPause}
                activeOpacity={0.7}
              >
                <Play size={64} color="white" />
              </TouchableOpacity>
            )}
            {/* Loading Spinner */}
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}
          </Pressable>
          <Pressable
            style={styles.doubleTapZoneRight}
            onPress={() => handleDoubleTap('right')}
          >
            {doubleTapSide === 'right' && (
              <View style={styles.seekOverlay}>
                <Text style={styles.seekText}>{`${SEEK_SECONDS}s  ⏩`}</Text>
              </View>
            )}
          </Pressable>
        </View>
        {/* Controls */}
        <Animated.View
          style={[
            styles.controls,
            {
              opacity: controlsOpacity,
              pointerEvents: controlsVisible ? 'auto' : 'none',
            },
          ]}
        >
          {/* Progress Bar with Thumb */}
          <Pressable onPress={handleSeekBarPress}>
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
                {/* Thumb */}
                <Animated.View
                  style={[
                    styles.thumb,
                    {
                      left: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, Dimensions.get('window').width - 32],
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
          </Pressable>
          {/* Controls Row */}
          <View style={styles.controlsRow}>
            <TouchableOpacity onPress={togglePlayPause} style={styles.iconButton}>
              {isPlaying ? <Pause size={32} color="white" /> : <Play size={32} color="white" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleMute} style={styles.iconButton}>
              {isMuted ? <VolumeX size={28} color="white" /> : <Volume2 size={28} color="white" />}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsFullscreen(f => !f)}
              style={styles.iconButton}
            >
              {isFullscreen ? (
                <Minimize2 size={28} color="white" />
              ) : (
                <Maximize2 size={28} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
    zIndex: 1000,
  },
  headerSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'black',
    zIndex: 1001,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    paddingVertical: 12,
  },
  closeButton: {
    width: 80,
    alignItems: 'flex-start',
    justifyContent: 'center',
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
  playerContainer: {
    flex: 1,
    backgroundColor: 'black',
    marginTop: Platform.OS === 'android' ? 56 : 64,
  },
  fullscreenPlayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    marginTop: 0,
    zIndex: 2000,
    elevation: 20,
  },
  flexRow: {
    flex: 1,
    flexDirection: 'row',
  },
  doubleTapZoneLeft: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 2,
  },
  doubleTapZoneRight: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    zIndex: 2,
  },
  seekOverlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: '40%',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 16,
    padding: 12,
  },
  seekText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  videoContainer: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  centerPlayButton: {
    position: 'absolute',
    alignSelf: 'center',
    top: '45%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 40,
    padding: 12,
    zIndex: 10,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  controls: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    width: '100%',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'visible',
    marginBottom: 2,
  },
  progress: {
    height: '100%',
    backgroundColor: '#FF0000',
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#FF0000',
    zIndex: 5,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  timeText: {
    color: 'white',
    fontSize: 14,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 24,
  },
  iconButton: {
    padding: 8,
  },
});

export default VideoPlayer;
