import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

export function useSocket() {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomState, setRoomState] = useState(null);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState(null);
  const [votingStatus, setVotingStatus] = useState({});
  const [revealedVotes, setRevealedVotes] = useState(null);
  const [timerInfo, setTimerInfo] = useState(null);
  const [isRoundLocked, setIsRoundLocked] = useState(false);
  const [myVote, setMyVote] = useState(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('error', (err) => {
      setError(err.message);
    });

    socket.on('room_state', (state) => {
      setRoomState(state);
      if (state.userId) {
        setUserId(state.userId);
      }
      if (state.votingStatus) {
        setVotingStatus(state.votingStatus);
      }
      if (state.currentRound) {
        setIsRoundLocked(state.currentRound.locked);
        if (state.currentRound.timerEndsAt) {
          setTimerInfo({
            timerEndsAt: state.currentRound.timerEndsAt
          });
        }
      }
    });

    socket.on('user_joined', ({ user }) => {
      setRoomState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          users: [...prev.users.filter(u => u.id !== user.id), user]
        };
      });
    });

    socket.on('user_left', ({ userId }) => {
      setRoomState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          users: prev.users.filter(u => u.id !== userId)
        };
      });
    });

    socket.on('user_disconnected', ({ userId }) => {
      setRoomState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          users: prev.users.map(u => 
            u.id === userId ? { ...u, connected: false } : u
          )
        };
      });
    });

    socket.on('user_reconnected', ({ userId }) => {
      setRoomState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          users: prev.users.map(u => 
            u.id === userId ? { ...u, connected: true } : u
          )
        };
      });
    });

    socket.on('user_updated', ({ user }) => {
      setRoomState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          users: prev.users.map(u => u.id === user.id ? user : u)
        };
      });
    });

    socket.on('room_settings_updated', ({ settings }) => {
      setRoomState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          room: { ...prev.room, settings }
        };
      });
    });

    socket.on('story_added', ({ story }) => {
      setRoomState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          room: {
            ...prev.room,
            stories: [...prev.room.stories, story]
          }
        };
      });
    });

    socket.on('current_story_changed', ({ story, storyId }) => {
      setRoomState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          room: {
            ...prev.room,
            currentStoryId: storyId,
            stories: prev.room.stories.map(s => 
              s.id === storyId ? { ...s, status: 'estimating' } : s
            )
          }
        };
      });
      // Reset voting state for new story
      setVotingStatus({});
      setRevealedVotes(null);
      setIsRoundLocked(false);
      setMyVote(null);
      setTimerInfo(null);
    });

    socket.on('round_started', ({ round }) => {
      setRoomState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          currentRound: round
        };
      });
      setVotingStatus({});
      setRevealedVotes(null);
      setIsRoundLocked(false);
      setMyVote(null);
      setTimerInfo(null);
    });

    socket.on('timer_started', (info) => {
      setTimerInfo(info);
    });

    socket.on('timer_stopped', () => {
      setTimerInfo(null);
    });

    socket.on('voting_status_updated', ({ votingStatus }) => {
      setVotingStatus(votingStatus);
    });

    socket.on('vote_confirmed', ({ value }) => {
      setMyVote(value);
    });

    socket.on('round_locked', () => {
      setIsRoundLocked(true);
    });

    socket.on('votes_revealed', ({ votes, summary }) => {
      setRevealedVotes({ votes, summary });
      setIsRoundLocked(true);
    });

    socket.on('final_estimate_selected', ({ story }) => {
      setRoomState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          room: {
            ...prev.room,
            stories: prev.room.stories.map(s => 
              s.id === story.id ? story : s
            )
          }
        };
      });
    });

    socket.on('session_ended', ({ room }) => {
      setRoomState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          room: { ...prev.room, status: 'ended' }
        };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinRoom = useCallback((roomId, displayName, avatarId) => {
    socketRef.current?.emit('join_room', { roomId, displayName, avatarId });
  }, []);

  const hostJoinRoom = useCallback((roomId, hostId) => {
    socketRef.current?.emit('host_join_room', { roomId, hostId });
  }, []);

  const changeAvatar = useCallback((roomId, avatarId) => {
    socketRef.current?.emit('change_avatar', { roomId, avatarId });
  }, []);

  const updateRoomSettings = useCallback((roomId, settings) => {
    socketRef.current?.emit('update_room_settings', { roomId, settings });
  }, []);

  const addStory = useCallback((roomId, story) => {
    socketRef.current?.emit('add_story', { roomId, story });
  }, []);

  const setCurrentStory = useCallback((roomId, storyId) => {
    socketRef.current?.emit('set_current_story', { roomId, storyId });
  }, []);

  const startRound = useCallback((roomId, storyId) => {
    socketRef.current?.emit('start_round', { roomId, storyId });
  }, []);

  const startTimer = useCallback((roomId) => {
    socketRef.current?.emit('start_timer', { roomId });
  }, []);

  const stopTimer = useCallback((roomId) => {
    socketRef.current?.emit('stop_timer', { roomId });
  }, []);

  const castVote = useCallback((roomId, storyId, value) => {
    socketRef.current?.emit('cast_vote', { roomId, storyId, value });
  }, []);

  const revealVotes = useCallback((roomId, storyId) => {
    socketRef.current?.emit('reveal_votes', { roomId, storyId });
  }, []);

  const selectFinalEstimate = useCallback((roomId, storyId, value) => {
    socketRef.current?.emit('select_final_estimate', { roomId, storyId, value });
  }, []);

  const endSession = useCallback((roomId) => {
    socketRef.current?.emit('end_session', { roomId });
  }, []);

  return {
    isConnected,
    roomState,
    userId,
    error,
    votingStatus,
    revealedVotes,
    timerInfo,
    isRoundLocked,
    myVote,
    joinRoom,
    hostJoinRoom,
    changeAvatar,
    updateRoomSettings,
    addStory,
    setCurrentStory,
    startRound,
    startTimer,
    stopTimer,
    castVote,
    revealVotes,
    selectFinalEstimate,
    endSession
  };
}
