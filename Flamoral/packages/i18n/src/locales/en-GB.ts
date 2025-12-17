/**
 * English (UK) translations
 */

export const enGB = {
  translation: {
    // Common
    common: {
      continue: 'Continue',
      back: 'Back',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      done: 'Done',
      skip: 'Skip',
      next: 'Next',
      previous: 'Previous',
      loading: 'Loading...',
      error: 'Something went wrong',
      retry: 'Retry',
      confirm: 'Confirm',
      yes: 'Yes',
      no: 'No',
      ok: 'OK',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      share: 'Share',
      report: 'Report',
      block: 'Block',
      unblock: 'Unblock',
      mute: 'Mute',
      unmute: 'Unmute',
    },

    // Authentication
    auth: {
      welcome: 'Welcome to Flamoral',
      tagline: 'Where meaningful connections bloom',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      signOut: 'Sign Out',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      forgotPassword: 'Forgot Password?',
      resetPassword: 'Reset Password',
      phoneNumber: 'Phone Number',
      verifyCode: 'Verify Code',
      sendCode: 'Send Code',
      resendCode: 'Resend Code',
      orContinueWith: 'Or continue with',
      agreeToTerms: 'By continuing, you agree to our',
      termsOfService: 'Terms of Service',
      and: 'and',
      privacyPolicy: 'Privacy Policy',
      errors: {
        invalidEmail: 'Please enter a valid email',
        invalidPassword: 'Password must be at least 8 characters',
        passwordMismatch: 'Passwords do not match',
        invalidPhone: 'Please enter a valid phone number',
        invalidCode: 'Invalid verification code',
        emailInUse: 'Email already in use',
        phoneInUse: 'Phone number already in use',
        wrongCredentials: 'Wrong email or password',
      },
    },

    // Onboarding (British English variations)
    onboarding: {
      steps: {
        name: {
          title: "What's your first name?",
          subtitle: "This is how you'll appear on Flamoral",
          placeholder: 'Your first name',
          hint: "This can't be changed later, so make sure it's right",
          error: {
            tooShort: 'Please enter at least 2 characters',
            tooLong: 'Name must be fewer than 30 characters',
            invalidChars: 'Please use only letters',
          },
        },
        birthday: {
          title: "When's your birthday, {{name}}?",
          subtitle: 'Your age will be shown on your profile',
          hint: "This can't be changed later. Make sure it's accurate.",
          youAre: "You're {{age}} years old",
          error: {
            tooYoung: 'You must be at least 18 years old',
            invalid: 'Please enter a valid date of birth',
          },
        },
        gender: {
          title: "What's your gender?",
          subtitle: 'This helps us show you to the right people',
          showOnProfile: 'Show on my profile',
          showOnProfileDesc: 'Your gender will be visible to others',
          options: {
            man: 'Man',
            woman: 'Woman',
            nonBinary: 'Non-binary',
            transgenderMan: 'Transgender Man',
            transgenderWoman: 'Transgender Woman',
            other: 'Other',
            preferNotToSay: 'Prefer not to say',
          },
        },
        interestedIn: {
          title: 'Who are you interested in?',
          subtitle: 'Select one or more options',
          hint: 'You can change this later in settings',
          options: {
            men: 'Men',
            women: 'Women',
            everyone: 'Everyone',
          },
        },
        photos: {
          title: 'Add your best photos',
          subtitle: 'Add at least {{min}} photos to continue. Your first photo will be your main profile picture.',
          required: '{{count}} of {{min}} required photos',
          tips: {
            title: 'Photo tips:',
            showFace: 'Show your face clearly',
            recent: 'Use recent photos',
            noGroups: 'Avoid group photos as your main',
            fullBody: 'Include full-body shots',
          },
          addPhoto: 'Add Photo',
          takePhoto: 'Take Photo',
          chooseFromLibrary: 'Choose from Library',
          mainPhoto: 'Main Photo',
          removePhoto: 'Remove Photo',
        },
        location: {
          title: 'Where are you located?',
          subtitle: "We'll show you people nearby. Your exact location is never shared.",
          enableLocation: 'Enable Location',
          tapToAllow: 'Tap to allow location access',
          locationConfirmed: 'Location confirmed',
          update: 'Update',
          privacy: {
            title: 'Your privacy matters',
            point1: 'Only your city is shown to others',
            point2: 'Your exact location is never shared',
            point3: 'You control your distance preferences',
          },
          error: {
            denied: 'Location permission denied',
            failed: 'Failed to get location. Please try again.',
          },
        },
        interests: {
          title: 'What are you into?',
          subtitle: 'Select at least {{min}} interests to help us find your matches',
          selected: '{{count}} / {{max}} selected',
        },
        prompts: {
          title: 'Tell us about yourself',
          subtitle: 'Answer {{count}} prompts to show your personality',
          answered: '{{count}} / {{max}} prompts answered',
          yourAnswers: 'Your answers',
          choosePrompt: 'Choose a prompt',
          saveAnswer: 'Save Answer',
          minChars: 'Minimum {{count}} characters',
        },
        relationshipGoals: {
          title: 'What are you looking for?',
          subtitle: 'This helps match you with people who want the same things',
          hint: 'You can change this later in your profile settings',
          options: {
            longTerm: {
              label: 'Long-term relationship',
              description: 'Looking for something serious and committed',
            },
            shortTerm: {
              label: 'Short-term relationship',
              description: 'Open to seeing where things go',
            },
            casual: {
              label: 'Something casual',
              description: 'Not looking for anything serious right now',
            },
            friendship: {
              label: 'New friends',
              description: 'Looking to expand my social circle',
            },
            notSure: {
              label: 'Still figuring it out',
              description: "I'll know it when I find it",
            },
          },
        },
        lifestyle: {
          title: 'Your lifestyle',
          subtitle: 'Help others understand your lifestyle (optional but recommended)',
          answered: '{{count}} / {{total}} answered',
          skipForNow: 'Skip for now',
          categories: {
            smoking: {
              title: 'Smoking',
              options: {
                never: 'Never',
                socially: 'Socially',
                regularly: 'Regularly',
                tryingToQuit: 'Trying to quit',
              },
            },
            drinking: {
              title: 'Drinking',
              options: {
                never: 'Never',
                socially: 'Socially',
                regularly: 'Regularly',
                sober: 'Sober',
              },
            },
            exercise: {
              title: 'Exercise',
              options: {
                never: 'Never',
                sometimes: 'Sometimes',
                often: 'Often',
                daily: 'Daily',
              },
            },
            diet: {
              title: 'Diet',
              options: {
                omnivore: 'Omnivore',
                vegetarian: 'Vegetarian',
                vegan: 'Vegan',
                other: 'Other',
              },
            },
            pets: {
              title: 'Pets',
              options: {
                none: 'No pets',
                dog: 'Dog',
                cat: 'Cat',
                other: 'Other pets',
              },
            },
          },
        },
        notifications: {
          title: 'Never miss a connection',
          subtitle: 'Turn on notifications to know when exciting things happen',
          enable: 'Enable Notifications',
          notNow: 'Not now',
          benefits: {
            messages: {
              title: 'New messages',
              description: "Know when someone you're interested in sends you a message",
            },
            matches: {
              title: 'New matches',
              description: 'Get excited when you match with someone new',
            },
            views: {
              title: 'Profile views',
              description: "See who's checking out your profile",
            },
            superLikes: {
              title: 'Super likes',
              description: "Don't miss when someone really likes you",
            },
          },
        },
        complete: {
          title: "You're all set, {{name}}!",
          subtitle: 'Your profile is ready. Time to start meeting amazing people.',
          stats: {
            photos: 'Photos',
            interests: 'Interests',
            prompts: 'Prompts',
          },
          tips: {
            title: 'Quick tips to get started:',
            swipe: 'Swipe right to like, left to pass',
            superLike: 'Super like to stand out',
            message: 'Send a message when you match',
          },
          startExploring: 'Start Exploring',
        },
      },
      progress: '{{current}} of {{total}}',
    },

    // Discovery/Swiping
    discovery: {
      title: 'Discover',
      noMoreProfiles: 'No more profiles nearby',
      expandSearch: 'Expand your search',
      refreshProfiles: 'Refresh profiles',
      distance: '{{distance}} km away',
      online: 'Online',
      lastActive: 'Active {{time}} ago',
      verified: 'Verified',
      compatibility: '{{score}}% compatible',
      actions: {
        pass: 'Pass',
        like: 'Like',
        superLike: 'Super Like',
        boost: 'Boost',
        rewind: 'Rewind',
      },
      outOfLikes: {
        title: 'Out of likes',
        subtitle: 'Upgrade to Premium for unlimited likes',
        waitTime: 'Or wait {{time}} for more',
      },
    },

    // Matches
    matches: {
      title: 'Matches',
      newMatch: "It's a Match!",
      newMatchSubtitle: 'You and {{name}} liked each other',
      sendMessage: 'Send a Message',
      keepSwiping: 'Keep Swiping',
      noMatches: 'No matches yet',
      startSwiping: 'Start swiping to find your matches',
      filters: {
        all: 'All',
        unread: 'Unread',
        superLikes: 'Super Likes',
      },
    },

    // Messages
    messages: {
      title: 'Messages',
      noMessages: 'No messages yet',
      startConversation: 'Match with someone to start chatting',
      typeMessage: 'Type a message...',
      send: 'Send',
      delivered: 'Delivered',
      read: 'Read',
      typing: 'typing...',
      icebreakers: {
        title: 'Break the ice',
        subtitle: "Not sure what to say? Try one of these:",
      },
      actions: {
        reply: 'Reply',
        copy: 'Copy',
        delete: 'Delete',
        report: 'Report',
      },
    },

    // Video Call
    videoCall: {
      calling: 'Calling...',
      connecting: 'Connecting...',
      connected: 'Connected',
      ended: 'Call ended',
      incoming: 'Incoming call...',
      incomingVideo: 'Incoming Video Call',
      incomingVoice: 'Incoming Voice Call',
      accept: 'Accept',
      decline: 'Decline',
      endCall: 'End',
      mute: 'Mute',
      unmute: 'Unmute',
      stopVideo: 'Stop Video',
      startVideo: 'Start Video',
      speaker: 'Speaker',
      switchCamera: 'Switch Camera',
      shareScreen: 'Share Screen',
      stopShare: 'Stop Share',
      duration: '{{duration}}',
    },

    // Events
    events: {
      title: 'Events',
      create: 'Create',
      noEvents: 'No events found',
      adjustFilters: 'Try adjusting your filters or check back later',
      spotsLeft: '{{count}} spots left',
      attending: 'attending',
      free: 'Free',
      going: 'Going',
      joinEvent: 'Join Event',
      leaveEvent: 'Leave Event',
      almostFull: 'Only {{count}} spots left!',
      details: {
        about: 'About this event',
        whatToExpect: 'What to expect',
        requirements: 'Requirements',
        whoGoing: "Who's going",
        seeAll: 'See all',
        hostedBy: 'Hosted by',
        eventsHosted: '{{count}} events hosted',
      },
      categories: {
        speedDating: 'Speed Dating',
        mixer: 'Mixer',
        outdoor: 'Outdoor',
        cooking: 'Cooking',
        wine: 'Wine',
        games: 'Games',
        fitness: 'Fitness',
        arts: 'Arts',
        virtual: 'Virtual',
      },
    },

    // Profile
    profile: {
      title: 'Profile',
      editProfile: 'Edit Profile',
      viewProfile: 'View Profile',
      settings: 'Settings',
      premium: 'Premium',
      verification: {
        title: 'Verification',
        verified: 'Verified',
        notVerified: 'Not verified',
        verifyNow: 'Verify now',
        photoVerified: 'Photo verified',
      },
      stats: {
        likes: 'Likes',
        views: 'Views',
        matches: 'Matches',
      },
    },

    // Settings
    settings: {
      title: 'Settings',
      account: {
        title: 'Account',
        email: 'Email',
        phone: 'Phone',
        password: 'Password',
        deleteAccount: 'Delete Account',
      },
      discovery: {
        title: 'Discovery',
        showMe: 'Show Me',
        ageRange: 'Age Range',
        distance: 'Maximum Distance',
        distanceUnit: 'km',
        global: 'Global Mode',
        globalDesc: 'See people from around the world',
      },
      notifications: {
        title: 'Notifications',
        push: 'Push Notifications',
        matches: 'New Matches',
        messages: 'Messages',
        likes: 'Likes',
        events: 'Events',
        marketing: 'Marketing',
      },
      privacy: {
        title: 'Privacy',
        showOnline: 'Show Online Status',
        readReceipts: 'Read Receipts',
        incognito: 'Incognito Mode',
        incognitoDesc: 'Browse profiles without being seen',
      },
      app: {
        title: 'App',
        language: 'Language',
        theme: 'Theme',
        themes: {
          light: 'Light',
          dark: 'Dark',
          system: 'System',
        },
      },
      about: {
        title: 'About',
        help: 'Help & Support',
        terms: 'Terms of Service',
        privacy: 'Privacy Policy',
        licenses: 'Licences',
        version: 'Version {{version}}',
      },
      logout: 'Log Out',
    },

    // Premium
    premium: {
      title: 'Flamoral Premium',
      subtitle: 'Unlock the full experience',
      features: {
        unlimitedLikes: 'Unlimited Likes',
        seeWhoLikes: 'See Who Likes You',
        rewind: 'Rewind Last Swipe',
        passport: 'Passport - Match Anywhere',
        boosts: '{{count}} Monthly Boosts',
        superLikes: '{{count}} Super Likes per Day',
        noAds: 'No Adverts',
        prioritySupport: 'Priority Support',
      },
      plans: {
        monthly: 'Monthly',
        quarterly: '3 Months',
        yearly: 'Yearly',
        save: 'Save {{percent}}%',
        price: '£{{amount}}/month',
      },
      subscribe: 'Subscribe',
      restore: 'Restore Purchases',
    },

    // Time
    time: {
      now: 'Now',
      minutesAgo: '{{count}}m ago',
      hoursAgo: '{{count}}h ago',
      daysAgo: '{{count}}d ago',
      weeksAgo: '{{count}}w ago',
      today: 'Today',
      yesterday: 'Yesterday',
    },

    // Formatting
    formatting: {
      currency: 'GBP',
      numberFormat: 'en-GB',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
    },
  },
};

export default enGB;
