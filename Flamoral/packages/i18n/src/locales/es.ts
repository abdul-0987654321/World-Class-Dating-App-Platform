/**
 * Spanish translations
 */

export const es = {
  translation: {
    // Common
    common: {
      continue: 'Continuar',
      back: 'Atrás',
      cancel: 'Cancelar',
      save: 'Guardar',
      delete: 'Eliminar',
      edit: 'Editar',
      done: 'Hecho',
      skip: 'Omitir',
      next: 'Siguiente',
      previous: 'Anterior',
      loading: 'Cargando...',
      error: 'Algo salió mal',
      retry: 'Reintentar',
      confirm: 'Confirmar',
      yes: 'Sí',
      no: 'No',
      ok: 'OK',
      search: 'Buscar',
      filter: 'Filtrar',
      sort: 'Ordenar',
      share: 'Compartir',
      report: 'Reportar',
      block: 'Bloquear',
      unblock: 'Desbloquear',
      mute: 'Silenciar',
      unmute: 'Activar sonido',
    },

    // Authentication
    auth: {
      welcome: 'Bienvenido a Heartly',
      tagline: 'Donde comienzan las conexiones significativas',
      signIn: 'Iniciar sesión',
      signUp: 'Registrarse',
      signOut: 'Cerrar sesión',
      email: 'Correo electrónico',
      password: 'Contraseña',
      confirmPassword: 'Confirmar contraseña',
      forgotPassword: '¿Olvidaste tu contraseña?',
      resetPassword: 'Restablecer contraseña',
      phoneNumber: 'Número de teléfono',
      verifyCode: 'Verificar código',
      sendCode: 'Enviar código',
      resendCode: 'Reenviar código',
      orContinueWith: 'O continúa con',
      agreeToTerms: 'Al continuar, aceptas nuestros',
      termsOfService: 'Términos de servicio',
      and: 'y',
      privacyPolicy: 'Política de privacidad',
      errors: {
        invalidEmail: 'Por favor ingresa un correo válido',
        invalidPassword: 'La contraseña debe tener al menos 8 caracteres',
        passwordMismatch: 'Las contraseñas no coinciden',
        invalidPhone: 'Por favor ingresa un número de teléfono válido',
        invalidCode: 'Código de verificación inválido',
        emailInUse: 'Este correo ya está en uso',
        phoneInUse: 'Este número ya está en uso',
        wrongCredentials: 'Correo o contraseña incorrectos',
      },
    },

    // Onboarding
    onboarding: {
      steps: {
        name: {
          title: '¿Cuál es tu nombre?',
          subtitle: 'Así aparecerás en Heartly',
          placeholder: 'Tu nombre',
          hint: 'Esto no se puede cambiar después, asegúrate de que sea correcto',
          error: {
            tooShort: 'Por favor ingresa al menos 2 caracteres',
            tooLong: 'El nombre debe tener menos de 30 caracteres',
            invalidChars: 'Por favor usa solo letras',
          },
        },
        birthday: {
          title: '¿Cuándo es tu cumpleaños, {{name}}?',
          subtitle: 'Tu edad se mostrará en tu perfil',
          hint: 'Esto no se puede cambiar después. Asegúrate de que sea correcto.',
          youAre: 'Tienes {{age}} años',
          error: {
            tooYoung: 'Debes tener al menos 18 años',
            invalid: 'Por favor ingresa una fecha de nacimiento válida',
          },
        },
        gender: {
          title: '¿Cuál es tu género?',
          subtitle: 'Esto nos ayuda a mostrarte a las personas correctas',
          showOnProfile: 'Mostrar en mi perfil',
          showOnProfileDesc: 'Tu género será visible para otros',
          options: {
            man: 'Hombre',
            woman: 'Mujer',
            nonBinary: 'No binario',
            transgenderMan: 'Hombre transgénero',
            transgenderWoman: 'Mujer transgénero',
            other: 'Otro',
            preferNotToSay: 'Prefiero no decir',
          },
        },
        interestedIn: {
          title: '¿En quién estás interesado/a?',
          subtitle: 'Selecciona una o más opciones',
          hint: 'Puedes cambiar esto más tarde en configuración',
          options: {
            men: 'Hombres',
            women: 'Mujeres',
            everyone: 'Todos',
          },
        },
      },
      progress: '{{current}} de {{total}}',
    },

    // Discovery
    discovery: {
      title: 'Descubrir',
      noMoreProfiles: 'No hay más perfiles cerca',
      expandSearch: 'Expande tu búsqueda',
      refreshProfiles: 'Actualizar perfiles',
      distance: 'A {{distance}} km',
      online: 'En línea',
      lastActive: 'Activo hace {{time}}',
      verified: 'Verificado',
      compatibility: '{{score}}% compatible',
      actions: {
        pass: 'Pasar',
        like: 'Me gusta',
        superLike: 'Super Like',
        boost: 'Impulsar',
        rewind: 'Deshacer',
      },
    },

    // Matches
    matches: {
      title: 'Coincidencias',
      newMatch: '¡Es un Match!',
      newMatchSubtitle: 'Tú y {{name}} se gustaron',
      sendMessage: 'Enviar un mensaje',
      keepSwiping: 'Seguir deslizando',
      noMatches: 'Aún no hay coincidencias',
      startSwiping: 'Comienza a deslizar para encontrar tus coincidencias',
    },

    // Messages
    messages: {
      title: 'Mensajes',
      noMessages: 'Aún no hay mensajes',
      startConversation: 'Haz match con alguien para empezar a chatear',
      typeMessage: 'Escribe un mensaje...',
      send: 'Enviar',
      delivered: 'Entregado',
      read: 'Leído',
      typing: 'escribiendo...',
    },

    // Video Call
    videoCall: {
      calling: 'Llamando...',
      connecting: 'Conectando...',
      connected: 'Conectado',
      ended: 'Llamada terminada',
      incoming: 'Llamada entrante...',
      accept: 'Aceptar',
      decline: 'Rechazar',
      endCall: 'Terminar',
      mute: 'Silenciar',
      unmute: 'Activar',
    },

    // Events
    events: {
      title: 'Eventos',
      create: 'Crear',
      noEvents: 'No se encontraron eventos',
      spotsLeft: '{{count}} lugares disponibles',
      free: 'Gratis',
      going: 'Asistiendo',
      joinEvent: 'Unirse al evento',
    },

    // Profile
    profile: {
      title: 'Perfil',
      editProfile: 'Editar perfil',
      viewProfile: 'Ver perfil',
      settings: 'Configuración',
      premium: 'Premium',
    },

    // Settings
    settings: {
      title: 'Configuración',
      logout: 'Cerrar sesión',
      account: {
        title: 'Cuenta',
        email: 'Correo electrónico',
        phone: 'Teléfono',
        password: 'Contraseña',
        deleteAccount: 'Eliminar cuenta',
      },
      discovery: {
        title: 'Descubrimiento',
        showMe: 'Mostrarme',
        ageRange: 'Rango de edad',
        distance: 'Distancia máxima',
      },
      notifications: {
        title: 'Notificaciones',
        push: 'Notificaciones push',
        matches: 'Nuevas coincidencias',
        messages: 'Mensajes',
      },
      app: {
        title: 'Aplicación',
        language: 'Idioma',
        theme: 'Tema',
      },
    },

    // Time
    time: {
      now: 'Ahora',
      minutesAgo: 'hace {{count}}m',
      hoursAgo: 'hace {{count}}h',
      daysAgo: 'hace {{count}}d',
      today: 'Hoy',
      yesterday: 'Ayer',
    },
  },
};

export default es;
