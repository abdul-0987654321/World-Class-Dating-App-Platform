/**
 * German (Germany) translations
 */

export const deDE = {
  translation: {
    common: {
      continue: 'Weiter',
      back: 'Zurück',
      cancel: 'Abbrechen',
      save: 'Speichern',
      delete: 'Löschen',
      edit: 'Bearbeiten',
      done: 'Fertig',
      skip: 'Überspringen',
      next: 'Weiter',
      previous: 'Zurück',
      loading: 'Lädt...',
      error: 'Etwas ist schief gelaufen',
      retry: 'Erneut versuchen',
      confirm: 'Bestätigen',
      yes: 'Ja',
      no: 'Nein',
      ok: 'OK',
      search: 'Suchen',
      filter: 'Filtern',
      sort: 'Sortieren',
      share: 'Teilen',
      report: 'Melden',
      block: 'Blockieren',
      unblock: 'Freigeben',
      mute: 'Stummschalten',
      unmute: 'Stummschaltung aufheben',
    },

    auth: {
      welcome: 'Willkommen bei Flamoral',
      tagline: 'Wo bedeutungsvolle Verbindungen erblühen',
      signIn: 'Anmelden',
      signUp: 'Registrieren',
      signOut: 'Abmelden',
      email: 'E-Mail',
      password: 'Passwort',
      confirmPassword: 'Passwort bestätigen',
      forgotPassword: 'Passwort vergessen?',
      resetPassword: 'Passwort zurücksetzen',
      phoneNumber: 'Telefonnummer',
      verifyCode: 'Code überprüfen',
      sendCode: 'Code senden',
      resendCode: 'Code erneut senden',
      orContinueWith: 'Oder fortfahren mit',
      agreeToTerms: 'Indem Sie fortfahren, akzeptieren Sie unsere',
      termsOfService: 'Nutzungsbedingungen',
      and: 'und',
      privacyPolicy: 'Datenschutzrichtlinie',
      errors: {
        invalidEmail: 'Bitte geben Sie eine gültige E-Mail ein',
        invalidPassword: 'Passwort muss mindestens 8 Zeichen lang sein',
        passwordMismatch: 'Passwörter stimmen nicht überein',
        invalidPhone: 'Bitte geben Sie eine gültige Telefonnummer ein',
        invalidCode: 'Ungültiger Verifizierungscode',
        emailInUse: 'E-Mail wird bereits verwendet',
        phoneInUse: 'Telefonnummer wird bereits verwendet',
        wrongCredentials: 'Falsche E-Mail oder Passwort',
      },
    },

    onboarding: {
      steps: {
        name: {
          title: 'Wie ist Ihr Vorname?',
          subtitle: 'So werden Sie auf Flamoral angezeigt',
          placeholder: 'Ihr Vorname',
          hint: 'Dies kann später nicht geändert werden',
          error: {
            tooShort: 'Bitte geben Sie mindestens 2 Zeichen ein',
            tooLong: 'Name muss weniger als 30 Zeichen lang sein',
            invalidChars: 'Bitte verwenden Sie nur Buchstaben',
          },
        },
        birthday: {
          title: 'Wann haben Sie Geburtstag, {{name}}?',
          subtitle: 'Ihr Alter wird in Ihrem Profil angezeigt',
          hint: 'Dies kann später nicht geändert werden',
          youAre: 'Sie sind {{age}} Jahre alt',
          error: {
            tooYoung: 'Sie müssen mindestens 18 Jahre alt sein',
            invalid: 'Bitte geben Sie ein gültiges Geburtsdatum ein',
          },
        },
        gender: {
          title: 'Was ist Ihr Geschlecht?',
          subtitle: 'Dies hilft uns, Sie den richtigen Personen zu zeigen',
          showOnProfile: 'In meinem Profil anzeigen',
          showOnProfileDesc: 'Ihr Geschlecht ist für andere sichtbar',
          options: {
            man: 'Mann',
            woman: 'Frau',
            nonBinary: 'Nicht-binär',
            transgenderMan: 'Transgender Mann',
            transgenderWoman: 'Transgender Frau',
            other: 'Sonstiges',
            preferNotToSay: 'Keine Angabe',
          },
        },
        interestedIn: {
          title: 'Wer interessiert Sie?',
          subtitle: 'Wählen Sie eine oder mehrere Optionen',
          hint: 'Sie können dies später in den Einstellungen ändern',
          options: {
            men: 'Männer',
            women: 'Frauen',
            everyone: 'Alle',
          },
        },
      },
      progress: '{{current}} von {{total}}',
    },

    discovery: {
      title: 'Entdecken',
      noMoreProfiles: 'Keine weiteren Profile in der Nähe',
      expandSearch: 'Suche erweitern',
      refreshProfiles: 'Profile aktualisieren',
      distance: '{{distance}} km entfernt',
      online: 'Online',
      lastActive: 'Zuletzt aktiv vor {{time}}',
      verified: 'Verifiziert',
      compatibility: '{{score}}% kompatibel',
      actions: {
        pass: 'Weiter',
        like: 'Gefällt mir',
        superLike: 'Super Like',
        boost: 'Boost',
        rewind: 'Rückgängig',
      },
    },

    matches: {
      title: 'Matches',
      newMatch: 'Es ist ein Match!',
      newMatchSubtitle: 'Sie und {{name}} mögen sich gegenseitig',
      sendMessage: 'Nachricht senden',
      keepSwiping: 'Weiter swipen',
      noMatches: 'Noch keine Matches',
      startSwiping: 'Beginnen Sie zu swipen, um Ihre Matches zu finden',
    },

    messages: {
      title: 'Nachrichten',
      noMessages: 'Noch keine Nachrichten',
      startConversation: 'Matchen Sie mit jemandem, um zu chatten',
      typeMessage: 'Nachricht eingeben...',
      send: 'Senden',
      delivered: 'Zugestellt',
      read: 'Gelesen',
      typing: 'tippt...',
    },

    profile: {
      title: 'Profil',
      editProfile: 'Profil bearbeiten',
      viewProfile: 'Profil anzeigen',
      settings: 'Einstellungen',
      premium: 'Premium',
    },

    settings: {
      title: 'Einstellungen',
      logout: 'Abmelden',
      app: {
        title: 'App',
        language: 'Sprache',
        theme: 'Design',
      },
    },

    premium: {
      title: 'Flamoral Premium',
      subtitle: 'Schalten Sie das volle Erlebnis frei',
      plans: {
        price: '{{amount}}€/Monat',
      },
    },

    time: {
      now: 'Jetzt',
      minutesAgo: 'vor {{count}}m',
      hoursAgo: 'vor {{count}}h',
      daysAgo: 'vor {{count}}T',
      today: 'Heute',
      yesterday: 'Gestern',
    },

    formatting: {
      currency: 'EUR',
      numberFormat: 'de-DE',
      dateFormat: 'DD.MM.YYYY',
      timeFormat: '24h',
    },
  },
};

export default deDE;
