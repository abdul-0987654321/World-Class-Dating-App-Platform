/**
 * Hindi (India) translations
 */

export const hiIN = {
  translation: {
    common: {
      continue: 'जारी रखें',
      back: 'वापस',
      cancel: 'रद्द करें',
      save: 'सहेजें',
      delete: 'हटाएं',
      edit: 'संपादित करें',
      done: 'हो गया',
      skip: 'छोड़ें',
      next: 'अगला',
      previous: 'पिछला',
      loading: 'लोड हो रहा है...',
      error: 'कुछ गलत हो गया',
      retry: 'पुनः प्रयास करें',
      confirm: 'पुष्टि करें',
      yes: 'हां',
      no: 'नहीं',
      ok: 'ठीक है',
      search: 'खोजें',
      filter: 'फ़िल्टर',
      sort: 'क्रमबद्ध करें',
      share: 'साझा करें',
      report: 'रिपोर्ट करें',
      block: 'ब्लॉक करें',
      unblock: 'अनब्लॉक करें',
      mute: 'म्यूट करें',
      unmute: 'अनम्यूट करें',
    },

    auth: {
      welcome: 'Flamoral में आपका स्वागत है',
      tagline: 'जहां सार्थक संबंध खिलते हैं',
      signIn: 'साइन इन करें',
      signUp: 'साइन अप करें',
      signOut: 'साइन आउट करें',
      email: 'ईमेल',
      password: 'पासवर्ड',
      confirmPassword: 'पासवर्ड की पुष्टि करें',
      forgotPassword: 'पासवर्ड भूल गए?',
      resetPassword: 'पासवर्ड रीसेट करें',
      phoneNumber: 'फ़ोन नंबर',
      verifyCode: 'कोड सत्यापित करें',
      sendCode: 'कोड भेजें',
      resendCode: 'कोड फिर से भेजें',
      orContinueWith: 'या इसके साथ जारी रखें',
      agreeToTerms: 'जारी रखने से, आप हमारी शर्तों से सहमत हैं',
      termsOfService: 'सेवा की शर्तें',
      and: 'और',
      privacyPolicy: 'गोपनीयता नीति',
      errors: {
        invalidEmail: 'कृपया एक मान्य ईमेल दर्ज करें',
        invalidPassword: 'पासवर्ड कम से कम 8 वर्णों का होना चाहिए',
        passwordMismatch: 'पासवर्ड मेल नहीं खाते',
        invalidPhone: 'कृपया एक मान्य फ़ोन नंबर दर्ज करें',
        invalidCode: 'अमान्य सत्यापन कोड',
        emailInUse: 'ईमेल पहले से उपयोग में है',
        phoneInUse: 'फ़ोन नंबर पहले से उपयोग में है',
        wrongCredentials: 'गलत ईमेल या पासवर्ड',
      },
    },

    onboarding: {
      steps: {
        name: {
          title: 'आपका पहला नाम क्या है?',
          subtitle: 'Flamoral पर आप इसी नाम से दिखेंगे',
          placeholder: 'आपका पहला नाम',
          hint: 'इसे बाद में बदला नहीं जा सकता',
          error: {
            tooShort: 'कृपया कम से कम 2 अक्षर दर्ज करें',
            tooLong: 'नाम 30 अक्षरों से कम होना चाहिए',
            invalidChars: 'कृपया केवल अक्षरों का उपयोग करें',
          },
        },
        birthday: {
          title: '{{name}}, आपका जन्मदिन कब है?',
          subtitle: 'आपकी उम्र आपकी प्रोफ़ाइल पर दिखाई जाएगी',
          hint: 'इसे बाद में बदला नहीं जा सकता',
          youAre: 'आप {{age}} वर्ष के हैं',
          error: {
            tooYoung: 'आपकी उम्र कम से कम 18 वर्ष होनी चाहिए',
            invalid: 'कृपया एक मान्य जन्म तिथि दर्ज करें',
          },
        },
        gender: {
          title: 'आपका लिंग क्या है?',
          subtitle: 'यह हमें आपको सही लोगों को दिखाने में मदद करता है',
          showOnProfile: 'मेरी प्रोफ़ाइल पर दिखाएं',
          showOnProfileDesc: 'आपका लिंग दूसरों को दिखाई देगा',
          options: {
            man: 'पुरुष',
            woman: 'महिला',
            nonBinary: 'नॉन-बाइनरी',
            transgenderMan: 'ट्रांसजेंडर पुरुष',
            transgenderWoman: 'ट्रांसजेंडर महिला',
            other: 'अन्य',
            preferNotToSay: 'नहीं बताना चाहते',
          },
        },
        interestedIn: {
          title: 'आप किसमें रुचि रखते हैं?',
          subtitle: 'एक या अधिक विकल्प चुनें',
          hint: 'आप इसे बाद में सेटिंग में बदल सकते हैं',
          options: {
            men: 'पुरुष',
            women: 'महिलाएं',
            everyone: 'सभी',
          },
        },
      },
      progress: '{{current}} में से {{total}}',
    },

    discovery: {
      title: 'खोजें',
      noMoreProfiles: 'पास में और प्रोफ़ाइल नहीं हैं',
      expandSearch: 'अपनी खोज का विस्तार करें',
      refreshProfiles: 'प्रोफ़ाइल रीफ्रेश करें',
      distance: '{{distance}} किमी दूर',
      online: 'ऑनलाइन',
      lastActive: '{{time}} पहले सक्रिय',
      verified: 'सत्यापित',
      compatibility: '{{score}}% संगत',
      actions: {
        pass: 'छोड़ें',
        like: 'पसंद',
        superLike: 'सुपर लाइक',
        boost: 'बूस्ट',
        rewind: 'वापस करें',
      },
    },

    matches: {
      title: 'मैच',
      newMatch: 'यह एक मैच है!',
      newMatchSubtitle: 'आप और {{name}} ने एक-दूसरे को पसंद किया',
      sendMessage: 'संदेश भेजें',
      keepSwiping: 'स्वाइप करना जारी रखें',
      noMatches: 'अभी तक कोई मैच नहीं',
      startSwiping: 'अपने मैच खोजने के लिए स्वाइप करना शुरू करें',
    },

    messages: {
      title: 'संदेश',
      noMessages: 'अभी तक कोई संदेश नहीं',
      startConversation: 'चैट शुरू करने के लिए किसी से मैच करें',
      typeMessage: 'संदेश टाइप करें...',
      send: 'भेजें',
      delivered: 'डिलीवर किया गया',
      read: 'पढ़ा गया',
      typing: 'टाइप कर रहे हैं...',
    },

    profile: {
      title: 'प्रोफ़ाइल',
      editProfile: 'प्रोफ़ाइल संपादित करें',
      viewProfile: 'प्रोफ़ाइल देखें',
      settings: 'सेटिंग',
      premium: 'प्रीमियम',
    },

    settings: {
      title: 'सेटिंग',
      logout: 'लॉग आउट',
      app: {
        title: 'ऐप',
        language: 'भाषा',
        theme: 'थीम',
      },
    },

    premium: {
      title: 'Flamoral प्रीमियम',
      subtitle: 'पूर्ण अनुभव अनलॉक करें',
      plans: {
        price: '₹{{amount}}/महीना',
      },
    },

    time: {
      now: 'अभी',
      minutesAgo: '{{count}} मिनट पहले',
      hoursAgo: '{{count}} घंटे पहले',
      daysAgo: '{{count}} दिन पहले',
      today: 'आज',
      yesterday: 'कल',
    },

    formatting: {
      currency: 'INR',
      numberFormat: 'hi-IN',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
    },
  },
};

export default hiIN;
