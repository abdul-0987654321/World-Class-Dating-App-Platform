/**
 * Portuguese (Brazil) translations
 */

export const ptBR = {
  translation: {
    common: {
      continue: 'Continuar',
      back: 'Voltar',
      cancel: 'Cancelar',
      save: 'Salvar',
      delete: 'Excluir',
      edit: 'Editar',
      done: 'Concluído',
      skip: 'Pular',
      next: 'Próximo',
      previous: 'Anterior',
      loading: 'Carregando...',
      error: 'Algo deu errado',
      retry: 'Tentar novamente',
      confirm: 'Confirmar',
      yes: 'Sim',
      no: 'Não',
      ok: 'OK',
      search: 'Pesquisar',
      filter: 'Filtrar',
      sort: 'Ordenar',
      share: 'Compartilhar',
      report: 'Denunciar',
      block: 'Bloquear',
      unblock: 'Desbloquear',
      mute: 'Silenciar',
      unmute: 'Ativar som',
    },

    auth: {
      welcome: 'Bem-vindo ao Flamoral',
      tagline: 'Onde conexões significativas florescem',
      signIn: 'Entrar',
      signUp: 'Cadastrar',
      signOut: 'Sair',
      email: 'E-mail',
      password: 'Senha',
      confirmPassword: 'Confirmar senha',
      forgotPassword: 'Esqueceu a senha?',
      resetPassword: 'Redefinir senha',
      phoneNumber: 'Número de telefone',
      verifyCode: 'Verificar código',
      sendCode: 'Enviar código',
      resendCode: 'Reenviar código',
      orContinueWith: 'Ou continue com',
      agreeToTerms: 'Ao continuar, você concorda com nossos',
      termsOfService: 'Termos de Serviço',
      and: 'e',
      privacyPolicy: 'Política de Privacidade',
      errors: {
        invalidEmail: 'Por favor, insira um e-mail válido',
        invalidPassword: 'A senha deve ter pelo menos 8 caracteres',
        passwordMismatch: 'As senhas não correspondem',
        invalidPhone: 'Por favor, insira um número de telefone válido',
        invalidCode: 'Código de verificação inválido',
        emailInUse: 'E-mail já em uso',
        phoneInUse: 'Número de telefone já em uso',
        wrongCredentials: 'E-mail ou senha incorretos',
      },
    },

    onboarding: {
      steps: {
        name: {
          title: 'Qual é o seu primeiro nome?',
          subtitle: 'É assim que você aparecerá no Flamoral',
          placeholder: 'Seu primeiro nome',
          hint: 'Isso não pode ser alterado depois',
          error: {
            tooShort: 'Por favor, insira pelo menos 2 caracteres',
            tooLong: 'O nome deve ter menos de 30 caracteres',
            invalidChars: 'Por favor, use apenas letras',
          },
        },
        birthday: {
          title: 'Quando é seu aniversário, {{name}}?',
          subtitle: 'Sua idade será mostrada no seu perfil',
          hint: 'Isso não pode ser alterado depois',
          youAre: 'Você tem {{age}} anos',
          error: {
            tooYoung: 'Você deve ter pelo menos 18 anos',
            invalid: 'Por favor, insira uma data de nascimento válida',
          },
        },
        gender: {
          title: 'Qual é o seu gênero?',
          subtitle: 'Isso nos ajuda a mostrar você para as pessoas certas',
          showOnProfile: 'Mostrar no meu perfil',
          showOnProfileDesc: 'Seu gênero ficará visível para outros',
          options: {
            man: 'Homem',
            woman: 'Mulher',
            nonBinary: 'Não-binário',
            transgenderMan: 'Homem transgênero',
            transgenderWoman: 'Mulher transgênero',
            other: 'Outro',
            preferNotToSay: 'Prefiro não dizer',
          },
        },
        interestedIn: {
          title: 'Quem te interessa?',
          subtitle: 'Selecione uma ou mais opções',
          hint: 'Você pode alterar isso depois nas configurações',
          options: {
            men: 'Homens',
            women: 'Mulheres',
            everyone: 'Todos',
          },
        },
      },
      progress: '{{current}} de {{total}}',
    },

    discovery: {
      title: 'Descobrir',
      noMoreProfiles: 'Não há mais perfis por perto',
      expandSearch: 'Expandir sua busca',
      refreshProfiles: 'Atualizar perfis',
      distance: '{{distance}} km de distância',
      online: 'Online',
      lastActive: 'Ativo há {{time}}',
      verified: 'Verificado',
      compatibility: '{{score}}% compatível',
      actions: {
        pass: 'Passar',
        like: 'Curtir',
        superLike: 'Super Like',
        boost: 'Impulsionar',
        rewind: 'Desfazer',
      },
    },

    matches: {
      title: 'Matches',
      newMatch: 'É um Match!',
      newMatchSubtitle: 'Você e {{name}} curtiram um ao outro',
      sendMessage: 'Enviar mensagem',
      keepSwiping: 'Continuar deslizando',
      noMatches: 'Ainda sem matches',
      startSwiping: 'Comece a deslizar para encontrar seus matches',
    },

    messages: {
      title: 'Mensagens',
      noMessages: 'Ainda sem mensagens',
      startConversation: 'Dê match com alguém para começar a conversar',
      typeMessage: 'Digite uma mensagem...',
      send: 'Enviar',
      delivered: 'Entregue',
      read: 'Lida',
      typing: 'digitando...',
    },

    profile: {
      title: 'Perfil',
      editProfile: 'Editar perfil',
      viewProfile: 'Ver perfil',
      settings: 'Configurações',
      premium: 'Premium',
    },

    settings: {
      title: 'Configurações',
      logout: 'Sair',
      app: {
        title: 'App',
        language: 'Idioma',
        theme: 'Tema',
      },
    },

    premium: {
      title: 'Flamoral Premium',
      subtitle: 'Desbloqueie a experiência completa',
      plans: {
        price: 'R$ {{amount}}/mês',
      },
    },

    time: {
      now: 'Agora',
      minutesAgo: 'há {{count}}m',
      hoursAgo: 'há {{count}}h',
      daysAgo: 'há {{count}}d',
      today: 'Hoje',
      yesterday: 'Ontem',
    },

    formatting: {
      currency: 'BRL',
      numberFormat: 'pt-BR',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
    },
  },
};

export default ptBR;
