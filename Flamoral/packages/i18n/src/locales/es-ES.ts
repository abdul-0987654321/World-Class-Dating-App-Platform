/**
 * Spanish (Spain) translations
 */

export const esES = {
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
      welcome: 'Bienvenido a Flamoral',
      tagline: 'Donde florecen las conexiones significativas',
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
          subtitle: 'Así aparecerás en Flamoral',
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
        photos: {
          title: 'Añade tus mejores fotos',
          subtitle: 'Añade al menos {{min}} fotos para continuar. Tu primera foto será tu imagen principal.',
          required: '{{count}} de {{min}} fotos requeridas',
          tips: {
            title: 'Consejos para las fotos:',
            showFace: 'Muestra tu rostro claramente',
            recent: 'Usa fotos recientes',
            noGroups: 'Evita fotos grupales como principal',
            fullBody: 'Incluye fotos de cuerpo entero',
          },
          addPhoto: 'Añadir foto',
          takePhoto: 'Tomar foto',
          chooseFromLibrary: 'Elegir de la galería',
          mainPhoto: 'Foto principal',
          removePhoto: 'Eliminar foto',
        },
        location: {
          title: '¿Dónde te encuentras?',
          subtitle: 'Te mostraremos personas cerca. Tu ubicación exacta nunca se comparte.',
          enableLocation: 'Activar ubicación',
          tapToAllow: 'Toca para permitir acceso a la ubicación',
          locationConfirmed: 'Ubicación confirmada',
          update: 'Actualizar',
          privacy: {
            title: 'Tu privacidad importa',
            point1: 'Solo se muestra tu ciudad a otros',
            point2: 'Tu ubicación exacta nunca se comparte',
            point3: 'Tú controlas tus preferencias de distancia',
          },
          error: {
            denied: 'Permiso de ubicación denegado',
            failed: 'Error al obtener ubicación. Por favor intenta de nuevo.',
          },
        },
        interests: {
          title: '¿Qué te interesa?',
          subtitle: 'Selecciona al menos {{min}} intereses para ayudarnos a encontrar tus matches',
          selected: '{{count}} / {{max}} seleccionados',
        },
        prompts: {
          title: 'Cuéntanos sobre ti',
          subtitle: 'Responde {{count}} preguntas para mostrar tu personalidad',
          answered: '{{count}} / {{max}} preguntas respondidas',
          yourAnswers: 'Tus respuestas',
          choosePrompt: 'Elige una pregunta',
          saveAnswer: 'Guardar respuesta',
          minChars: 'Mínimo {{count}} caracteres',
        },
        relationshipGoals: {
          title: '¿Qué estás buscando?',
          subtitle: 'Esto ayuda a emparejarte con personas que quieren lo mismo',
          hint: 'Puedes cambiar esto más tarde en la configuración de tu perfil',
          options: {
            longTerm: {
              label: 'Relación a largo plazo',
              description: 'Busco algo serio y comprometido',
            },
            shortTerm: {
              label: 'Relación a corto plazo',
              description: 'Abierto a ver cómo van las cosas',
            },
            casual: {
              label: 'Algo casual',
              description: 'No busco nada serio ahora mismo',
            },
            friendship: {
              label: 'Nuevos amigos',
              description: 'Buscando ampliar mi círculo social',
            },
            notSure: {
              label: 'Aún lo estoy descubriendo',
              description: 'Lo sabré cuando lo encuentre',
            },
          },
        },
        lifestyle: {
          title: 'Tu estilo de vida',
          subtitle: 'Ayuda a otros a entender tu estilo de vida (opcional pero recomendado)',
          answered: '{{count}} / {{total}} respondidas',
          skipForNow: 'Omitir por ahora',
          categories: {
            smoking: {
              title: 'Fumar',
              options: {
                never: 'Nunca',
                socially: 'Socialmente',
                regularly: 'Regularmente',
                tryingToQuit: 'Intentando dejarlo',
              },
            },
            drinking: {
              title: 'Beber',
              options: {
                never: 'Nunca',
                socially: 'Socialmente',
                regularly: 'Regularmente',
                sober: 'Sobrio',
              },
            },
            exercise: {
              title: 'Ejercicio',
              options: {
                never: 'Nunca',
                sometimes: 'A veces',
                often: 'A menudo',
                daily: 'Diariamente',
              },
            },
            diet: {
              title: 'Dieta',
              options: {
                omnivore: 'Omnívoro',
                vegetarian: 'Vegetariano',
                vegan: 'Vegano',
                other: 'Otro',
              },
            },
            pets: {
              title: 'Mascotas',
              options: {
                none: 'Sin mascotas',
                dog: 'Perro',
                cat: 'Gato',
                other: 'Otras mascotas',
              },
            },
          },
        },
        notifications: {
          title: 'No te pierdas ninguna conexión',
          subtitle: 'Activa las notificaciones para saber cuando pasan cosas emocionantes',
          enable: 'Activar notificaciones',
          notNow: 'Ahora no',
          benefits: {
            messages: {
              title: 'Nuevos mensajes',
              description: 'Sabe cuando alguien que te interesa te envía un mensaje',
            },
            matches: {
              title: 'Nuevos matches',
              description: 'Emociónate cuando coincidas con alguien nuevo',
            },
            views: {
              title: 'Vistas de perfil',
              description: 'Ve quién está viendo tu perfil',
            },
            superLikes: {
              title: 'Super likes',
              description: 'No te pierdas cuando a alguien realmente le gustas',
            },
          },
        },
        complete: {
          title: '¡Todo listo, {{name}}!',
          subtitle: 'Tu perfil está preparado. Es hora de conocer gente increíble.',
          stats: {
            photos: 'Fotos',
            interests: 'Intereses',
            prompts: 'Preguntas',
          },
          tips: {
            title: 'Consejos rápidos para empezar:',
            swipe: 'Desliza a la derecha para dar me gusta, a la izquierda para pasar',
            superLike: 'Super like para destacar',
            message: 'Envía un mensaje cuando coincidas',
          },
          startExploring: 'Comenzar a explorar',
        },
      },
      progress: '{{current}} de {{total}}',
    },

    // Discovery/Swiping
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
      outOfLikes: {
        title: 'Sin me gustas',
        subtitle: 'Mejora a Premium para me gustas ilimitados',
        waitTime: 'O espera {{time}} para más',
      },
    },

    // Matches
    matches: {
      title: 'Matches',
      newMatch: '¡Es un Match!',
      newMatchSubtitle: 'Tú y {{name}} se gustaron mutuamente',
      sendMessage: 'Enviar un mensaje',
      keepSwiping: 'Seguir deslizando',
      noMatches: 'Aún no hay matches',
      startSwiping: 'Comienza a deslizar para encontrar tus matches',
      filters: {
        all: 'Todos',
        unread: 'No leídos',
        superLikes: 'Super Likes',
      },
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
      icebreakers: {
        title: 'Rompe el hielo',
        subtitle: '¿No sabes qué decir? Prueba uno de estos:',
      },
      actions: {
        reply: 'Responder',
        copy: 'Copiar',
        delete: 'Eliminar',
        report: 'Reportar',
      },
    },

    // Video Call
    videoCall: {
      calling: 'Llamando...',
      connecting: 'Conectando...',
      connected: 'Conectado',
      ended: 'Llamada terminada',
      incoming: 'Llamada entrante...',
      incomingVideo: 'Videollamada entrante',
      incomingVoice: 'Llamada de voz entrante',
      accept: 'Aceptar',
      decline: 'Rechazar',
      endCall: 'Terminar',
      mute: 'Silenciar',
      unmute: 'Activar',
      stopVideo: 'Detener vídeo',
      startVideo: 'Iniciar vídeo',
      speaker: 'Altavoz',
      switchCamera: 'Cambiar cámara',
      shareScreen: 'Compartir pantalla',
      stopShare: 'Dejar de compartir',
      duration: '{{duration}}',
    },

    // Events
    events: {
      title: 'Eventos',
      create: 'Crear',
      noEvents: 'No se encontraron eventos',
      adjustFilters: 'Intenta ajustar tus filtros o vuelve más tarde',
      spotsLeft: '{{count}} lugares disponibles',
      attending: 'asistiendo',
      free: 'Gratis',
      going: 'Asistiendo',
      joinEvent: 'Unirse al evento',
      leaveEvent: 'Salir del evento',
      almostFull: '¡Solo quedan {{count}} lugares!',
      details: {
        about: 'Sobre este evento',
        whatToExpect: 'Qué esperar',
        requirements: 'Requisitos',
        whoGoing: 'Quién va',
        seeAll: 'Ver todo',
        hostedBy: 'Organizado por',
        eventsHosted: '{{count}} eventos organizados',
      },
      categories: {
        speedDating: 'Citas rápidas',
        mixer: 'Mezclador',
        outdoor: 'Al aire libre',
        cooking: 'Cocina',
        wine: 'Vino',
        games: 'Juegos',
        fitness: 'Fitness',
        arts: 'Arte',
        virtual: 'Virtual',
      },
    },

    // Profile
    profile: {
      title: 'Perfil',
      editProfile: 'Editar perfil',
      viewProfile: 'Ver perfil',
      settings: 'Configuración',
      premium: 'Premium',
      verification: {
        title: 'Verificación',
        verified: 'Verificado',
        notVerified: 'No verificado',
        verifyNow: 'Verificar ahora',
        photoVerified: 'Foto verificada',
      },
      stats: {
        likes: 'Me gustas',
        views: 'Vistas',
        matches: 'Matches',
      },
    },

    // Settings
    settings: {
      title: 'Configuración',
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
        distanceUnit: 'km',
        global: 'Modo global',
        globalDesc: 'Ver personas de todo el mundo',
      },
      notifications: {
        title: 'Notificaciones',
        push: 'Notificaciones push',
        matches: 'Nuevos matches',
        messages: 'Mensajes',
        likes: 'Me gustas',
        events: 'Eventos',
        marketing: 'Marketing',
      },
      privacy: {
        title: 'Privacidad',
        showOnline: 'Mostrar estado en línea',
        readReceipts: 'Confirmaciones de lectura',
        incognito: 'Modo incógnito',
        incognitoDesc: 'Navega perfiles sin ser visto',
      },
      app: {
        title: 'Aplicación',
        language: 'Idioma',
        theme: 'Tema',
        themes: {
          light: 'Claro',
          dark: 'Oscuro',
          system: 'Sistema',
        },
      },
      about: {
        title: 'Acerca de',
        help: 'Ayuda y soporte',
        terms: 'Términos de servicio',
        privacy: 'Política de privacidad',
        licenses: 'Licencias',
        version: 'Versión {{version}}',
      },
      logout: 'Cerrar sesión',
    },

    // Premium
    premium: {
      title: 'Flamoral Premium',
      subtitle: 'Desbloquea la experiencia completa',
      features: {
        unlimitedLikes: 'Me gustas ilimitados',
        seeWhoLikes: 'Ver quién te da me gusta',
        rewind: 'Deshacer último deslizamiento',
        passport: 'Pasaporte - Haz match en cualquier lugar',
        boosts: '{{count}} impulsos mensuales',
        superLikes: '{{count}} Super Likes por día',
        noAds: 'Sin anuncios',
        prioritySupport: 'Soporte prioritario',
      },
      plans: {
        monthly: 'Mensual',
        quarterly: '3 meses',
        yearly: 'Anual',
        save: 'Ahorra {{percent}}%',
        price: '{{amount}}€/mes',
      },
      subscribe: 'Suscribirse',
      restore: 'Restaurar compras',
    },

    // Time
    time: {
      now: 'Ahora',
      minutesAgo: 'hace {{count}}m',
      hoursAgo: 'hace {{count}}h',
      daysAgo: 'hace {{count}}d',
      weeksAgo: 'hace {{count}}sem',
      today: 'Hoy',
      yesterday: 'Ayer',
    },

    // Formatting
    formatting: {
      currency: 'EUR',
      numberFormat: 'es-ES',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
    },
  },
};

export default esES;
