/**
 * French (France) translations
 */

export const frFR = {
  translation: {
    common: {
      continue: 'Continuer',
      back: 'Retour',
      cancel: 'Annuler',
      save: 'Enregistrer',
      delete: 'Supprimer',
      edit: 'Modifier',
      done: 'Terminé',
      skip: 'Passer',
      next: 'Suivant',
      previous: 'Précédent',
      loading: 'Chargement...',
      error: 'Une erreur s\'est produite',
      retry: 'Réessayer',
      confirm: 'Confirmer',
      yes: 'Oui',
      no: 'Non',
      ok: 'OK',
      search: 'Rechercher',
      filter: 'Filtrer',
      sort: 'Trier',
      share: 'Partager',
      report: 'Signaler',
      block: 'Bloquer',
      unblock: 'Débloquer',
      mute: 'Masquer',
      unmute: 'Afficher',
    },

    auth: {
      welcome: 'Bienvenue sur Flamoral',
      tagline: 'Où les connexions significatives fleurissent',
      signIn: 'Se connecter',
      signUp: 'S\'inscrire',
      signOut: 'Se déconnecter',
      email: 'E-mail',
      password: 'Mot de passe',
      confirmPassword: 'Confirmer le mot de passe',
      forgotPassword: 'Mot de passe oublié ?',
      resetPassword: 'Réinitialiser le mot de passe',
      phoneNumber: 'Numéro de téléphone',
      verifyCode: 'Vérifier le code',
      sendCode: 'Envoyer le code',
      resendCode: 'Renvoyer le code',
      orContinueWith: 'Ou continuez avec',
      agreeToTerms: 'En continuant, vous acceptez nos',
      termsOfService: 'Conditions d\'utilisation',
      and: 'et',
      privacyPolicy: 'Politique de confidentialité',
      errors: {
        invalidEmail: 'Veuillez entrer une adresse e-mail valide',
        invalidPassword: 'Le mot de passe doit contenir au moins 8 caractères',
        passwordMismatch: 'Les mots de passe ne correspondent pas',
        invalidPhone: 'Veuillez entrer un numéro de téléphone valide',
        invalidCode: 'Code de vérification invalide',
        emailInUse: 'Cet e-mail est déjà utilisé',
        phoneInUse: 'Ce numéro est déjà utilisé',
        wrongCredentials: 'E-mail ou mot de passe incorrect',
      },
    },

    onboarding: {
      steps: {
        name: {
          title: 'Quel est votre prénom ?',
          subtitle: 'C\'est ainsi que vous apparaîtrez sur Flamoral',
          placeholder: 'Votre prénom',
          hint: 'Cela ne peut pas être modifié plus tard',
          error: {
            tooShort: 'Veuillez entrer au moins 2 caractères',
            tooLong: 'Le nom doit faire moins de 30 caractères',
            invalidChars: 'Veuillez utiliser uniquement des lettres',
          },
        },
        birthday: {
          title: 'Quelle est votre date de naissance, {{name}} ?',
          subtitle: 'Votre âge sera affiché sur votre profil',
          hint: 'Cela ne peut pas être modifié plus tard',
          youAre: 'Vous avez {{age}} ans',
          error: {
            tooYoung: 'Vous devez avoir au moins 18 ans',
            invalid: 'Veuillez entrer une date de naissance valide',
          },
        },
        gender: {
          title: 'Quel est votre genre ?',
          subtitle: 'Cela nous aide à vous montrer aux bonnes personnes',
          showOnProfile: 'Afficher sur mon profil',
          showOnProfileDesc: 'Votre genre sera visible par les autres',
          options: {
            man: 'Homme',
            woman: 'Femme',
            nonBinary: 'Non-binaire',
            transgenderMan: 'Homme transgenre',
            transgenderWoman: 'Femme transgenre',
            other: 'Autre',
            preferNotToSay: 'Préfère ne pas dire',
          },
        },
        interestedIn: {
          title: 'Qui vous intéresse ?',
          subtitle: 'Sélectionnez une ou plusieurs options',
          hint: 'Vous pourrez modifier cela plus tard dans les paramètres',
          options: {
            men: 'Hommes',
            women: 'Femmes',
            everyone: 'Tout le monde',
          },
        },
      },
      progress: '{{current}} sur {{total}}',
    },

    discovery: {
      title: 'Découvrir',
      noMoreProfiles: 'Plus de profils à proximité',
      expandSearch: 'Élargir votre recherche',
      refreshProfiles: 'Actualiser les profils',
      distance: 'À {{distance}} km',
      online: 'En ligne',
      lastActive: 'Actif il y a {{time}}',
      verified: 'Vérifié',
      compatibility: '{{score}}% compatible',
      actions: {
        pass: 'Passer',
        like: 'J\'aime',
        superLike: 'Super Like',
        boost: 'Boost',
        rewind: 'Annuler',
      },
    },

    matches: {
      title: 'Matchs',
      newMatch: 'C\'est un Match !',
      newMatchSubtitle: 'Vous et {{name}} vous êtes aimés mutuellement',
      sendMessage: 'Envoyer un message',
      keepSwiping: 'Continuer à swiper',
      noMatches: 'Pas encore de matchs',
      startSwiping: 'Commencez à swiper pour trouver vos matchs',
    },

    messages: {
      title: 'Messages',
      noMessages: 'Pas encore de messages',
      startConversation: 'Matchez avec quelqu\'un pour commencer à discuter',
      typeMessage: 'Tapez un message...',
      send: 'Envoyer',
      delivered: 'Distribué',
      read: 'Lu',
      typing: 'tape...',
    },

    profile: {
      title: 'Profil',
      editProfile: 'Modifier le profil',
      viewProfile: 'Voir le profil',
      settings: 'Paramètres',
      premium: 'Premium',
    },

    settings: {
      title: 'Paramètres',
      logout: 'Se déconnecter',
      app: {
        title: 'Application',
        language: 'Langue',
        theme: 'Thème',
      },
    },

    premium: {
      title: 'Flamoral Premium',
      subtitle: 'Débloquez l\'expérience complète',
      plans: {
        price: '{{amount}}€/mois',
      },
    },

    time: {
      now: 'Maintenant',
      minutesAgo: 'il y a {{count}}m',
      hoursAgo: 'il y a {{count}}h',
      daysAgo: 'il y a {{count}}j',
      today: 'Aujourd\'hui',
      yesterday: 'Hier',
    },

    formatting: {
      currency: 'EUR',
      numberFormat: 'fr-FR',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
    },
  },
};

export default frFR;
