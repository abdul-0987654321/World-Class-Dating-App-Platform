/**
 * Swahili (Kenya) translations
 */

export const swKE = {
  translation: {
    common: {
      continue: 'Endelea',
      back: 'Rudi',
      cancel: 'Ghairi',
      save: 'Hifadhi',
      delete: 'Futa',
      edit: 'Hariri',
      done: 'Imekamilika',
      skip: 'Ruka',
      next: 'Ifuatayo',
      previous: 'Iliyopita',
      loading: 'Inapakia...',
      error: 'Kuna kitu kimeenda vibaya',
      retry: 'Jaribu tena',
      confirm: 'Thibitisha',
      yes: 'Ndio',
      no: 'Hapana',
      ok: 'Sawa',
      search: 'Tafuta',
      filter: 'Chuja',
      sort: 'Panga',
      share: 'Shiriki',
      report: 'Ripoti',
      block: 'Zuia',
      unblock: 'Ondoa kuzuiwa',
      mute: 'Nyamazisha',
      unmute: 'Ondoa unyamazishaji',
    },

    auth: {
      welcome: 'Karibu kwenye Flamoral',
      tagline: 'Mahali ambapo uhusiano wenye maana unachanua',
      signIn: 'Ingia',
      signUp: 'Jisajili',
      signOut: 'Toka',
      email: 'Barua pepe',
      password: 'Nenosiri',
      confirmPassword: 'Thibitisha Nenosiri',
      forgotPassword: 'Umesahau nenosiri?',
      resetPassword: 'Weka upya nenosiri',
      phoneNumber: 'Nambari ya simu',
      verifyCode: 'Thibitisha nambari',
      sendCode: 'Tuma nambari',
      resendCode: 'Tuma tena nambari',
      orContinueWith: 'Au endelea na',
      agreeToTerms: 'Kwa kuendelea, unakubali',
      termsOfService: 'Masharti ya Huduma',
      and: 'na',
      privacyPolicy: 'Sera ya Faragha',
      errors: {
        invalidEmail: 'Tafadhali weka barua pepe halali',
        invalidPassword: 'Nenosiri lazima liwe na angalau herufi 8',
        passwordMismatch: 'Nenosiri hazifanani',
        invalidPhone: 'Tafadhali weka nambari ya simu halali',
        invalidCode: 'Nambari ya kuthibitisha si halali',
        emailInUse: 'Barua pepe tayari inatumika',
        phoneInUse: 'Nambari ya simu tayari inatumika',
        wrongCredentials: 'Barua pepe au nenosiri si sahihi',
      },
    },

    onboarding: {
      steps: {
        name: {
          title: 'Jina lako la kwanza ni nini?',
          subtitle: 'Hivi ndivyo utakavyoonekana kwenye Flamoral',
          placeholder: 'Jina lako la kwanza',
          hint: 'Hili haliwezi kubadilishwa baadaye',
          error: {
            tooShort: 'Tafadhali weka angalau herufi 2',
            tooLong: 'Jina lazima liwe chini ya herufi 30',
            invalidChars: 'Tafadhali tumia herufi tu',
          },
        },
        birthday: {
          title: 'Siku yako ya kuzaliwa ni lini, {{name}}?',
          subtitle: 'Umri wako utaoneshwa kwenye wasifu wako',
          hint: 'Hili haliwezi kubadilishwa baadaye',
          youAre: 'Una miaka {{age}}',
          error: {
            tooYoung: 'Lazima uwe na miaka 18 au zaidi',
            invalid: 'Tafadhali weka tarehe halali ya kuzaliwa',
          },
        },
        gender: {
          title: 'Jinsia yako ni nini?',
          subtitle: 'Hii inatusaidia kukuonyesha kwa watu wanaofaa',
          showOnProfile: 'Onyesha kwenye wasifu wangu',
          showOnProfileDesc: 'Jinsia yako itaonekana kwa wengine',
          options: {
            man: 'Mwanaume',
            woman: 'Mwanamke',
            nonBinary: 'Si-binary',
            transgenderMan: 'Mwanaume transgender',
            transgenderWoman: 'Mwanamke transgender',
            other: 'Nyingine',
            preferNotToSay: 'Napendelea kutosema',
          },
        },
        interestedIn: {
          title: 'Unavutiwa na nani?',
          subtitle: 'Chagua chaguo moja au zaidi',
          hint: 'Unaweza kubadilisha hili baadaye kwenye mipangilio',
          options: {
            men: 'Wanaume',
            women: 'Wanawake',
            everyone: 'Kila mtu',
          },
        },
      },
      progress: '{{current}} kati ya {{total}}',
    },

    discovery: {
      title: 'Gundua',
      noMoreProfiles: 'Hakuna wasifu zaidi karibu',
      expandSearch: 'Panua utafutaji wako',
      refreshProfiles: 'Sasisha wasifu',
      distance: '{{distance}} km mbali',
      online: 'Mtandaoni',
      lastActive: 'Mwisho kuwa hai {{time}} iliyopita',
      verified: 'Imethibitishwa',
      compatibility: '{{score}}% unaolingana',
      actions: {
        pass: 'Ruka',
        like: 'Penda',
        superLike: 'Super Like',
        boost: 'Ongeza',
        rewind: 'Rudisha',
      },
    },

    matches: {
      title: 'Mechi',
      newMatch: 'Ni Mechi!',
      newMatchSubtitle: 'Wewe na {{name}} mmependana',
      sendMessage: 'Tuma Ujumbe',
      keepSwiping: 'Endelea Kuswipe',
      noMatches: 'Hakuna mechi bado',
      startSwiping: 'Anza kuswipe kupata mechi zako',
    },

    messages: {
      title: 'Ujumbe',
      noMessages: 'Hakuna ujumbe bado',
      startConversation: 'Pata mechi ili kuanza kupiga gumzo',
      typeMessage: 'Andika ujumbe...',
      send: 'Tuma',
      delivered: 'Imefikishwa',
      read: 'Imesomwa',
      typing: 'anaandika...',
    },

    profile: {
      title: 'Wasifu',
      editProfile: 'Hariri Wasifu',
      viewProfile: 'Tazama Wasifu',
      settings: 'Mipangilio',
      premium: 'Premium',
    },

    settings: {
      title: 'Mipangilio',
      logout: 'Toka',
      app: {
        title: 'Programu',
        language: 'Lugha',
        theme: 'Mandhari',
      },
    },

    premium: {
      title: 'Flamoral Premium',
      subtitle: 'Fungua uzoefu kamili',
      plans: {
        price: 'KSh {{amount}}/mwezi',
      },
    },

    time: {
      now: 'Sasa',
      minutesAgo: '{{count}}d iliyopita',
      hoursAgo: '{{count}}s iliyopita',
      daysAgo: 'siku {{count}} iliyopita',
      today: 'Leo',
      yesterday: 'Jana',
    },

    formatting: {
      currency: 'KES',
      numberFormat: 'sw-KE',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
    },
  },
};

export default swKE;
