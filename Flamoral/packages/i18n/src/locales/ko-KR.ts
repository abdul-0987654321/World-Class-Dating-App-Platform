/**
 * Korean (Korea) translations
 */

export const koKR = {
  translation: {
    common: {
      continue: '계속',
      back: '뒤로',
      cancel: '취소',
      save: '저장',
      delete: '삭제',
      edit: '편집',
      done: '완료',
      skip: '건너뛰기',
      next: '다음',
      previous: '이전',
      loading: '로딩 중...',
      error: '문제가 발생했습니다',
      retry: '다시 시도',
      confirm: '확인',
      yes: '예',
      no: '아니오',
      ok: '확인',
      search: '검색',
      filter: '필터',
      sort: '정렬',
      share: '공유',
      report: '신고',
      block: '차단',
      unblock: '차단 해제',
      mute: '음소거',
      unmute: '음소거 해제',
    },

    auth: {
      welcome: 'Flamoral에 오신 것을 환영합니다',
      tagline: '의미 있는 연결이 피어나는 곳',
      signIn: '로그인',
      signUp: '회원가입',
      signOut: '로그아웃',
      email: '이메일',
      password: '비밀번호',
      confirmPassword: '비밀번호 확인',
      forgotPassword: '비밀번호를 잊으셨나요?',
      resetPassword: '비밀번호 재설정',
      phoneNumber: '전화번호',
      verifyCode: '인증 코드',
      sendCode: '코드 전송',
      resendCode: '재전송',
      orContinueWith: '또는 다음으로 계속',
      agreeToTerms: '계속하면 다음에 동의하는 것입니다',
      termsOfService: '서비스 약관',
      and: '및',
      privacyPolicy: '개인정보 처리방침',
      errors: {
        invalidEmail: '유효한 이메일을 입력해주세요',
        invalidPassword: '비밀번호는 최소 8자 이상이어야 합니다',
        passwordMismatch: '비밀번호가 일치하지 않습니다',
        invalidPhone: '유효한 전화번호를 입력해주세요',
        invalidCode: '인증 코드가 유효하지 않습니다',
        emailInUse: '이미 사용 중인 이메일입니다',
        phoneInUse: '이미 사용 중인 전화번호입니다',
        wrongCredentials: '이메일 또는 비밀번호가 올바르지 않습니다',
      },
    },

    onboarding: {
      steps: {
        name: {
          title: '이름이 무엇인가요?',
          subtitle: 'Flamoral에서 표시될 이름입니다',
          placeholder: '이름',
          hint: '나중에 변경할 수 없으니 정확히 입력해주세요',
          error: {
            tooShort: '최소 2자 이상 입력해주세요',
            tooLong: '이름은 30자 미만이어야 합니다',
            invalidChars: '문자만 사용해주세요',
          },
        },
        birthday: {
          title: '{{name}}님, 생일이 언제인가요?',
          subtitle: '나이가 프로필에 표시됩니다',
          hint: '나중에 변경할 수 없으니 정확히 입력해주세요',
          youAre: '{{age}}세입니다',
          error: {
            tooYoung: '만 18세 이상이어야 합니다',
            invalid: '유효한 생년월일을 입력해주세요',
          },
        },
        gender: {
          title: '성별이 무엇인가요?',
          subtitle: '적합한 사람들에게 회원님을 보여주는 데 도움이 됩니다',
          showOnProfile: '프로필에 표시',
          showOnProfileDesc: '성별이 다른 사용자에게 표시됩니다',
          options: {
            man: '남성',
            woman: '여성',
            nonBinary: '논바이너리',
            transgenderMan: '트랜스젠더 남성',
            transgenderWoman: '트랜스젠더 여성',
            other: '기타',
            preferNotToSay: '밝히고 싶지 않음',
          },
        },
        interestedIn: {
          title: '누구에게 관심이 있나요?',
          subtitle: '하나 이상의 옵션을 선택하세요',
          hint: '나중에 설정에서 변경할 수 있습니다',
          options: {
            men: '남성',
            women: '여성',
            everyone: '모두',
          },
        },
      },
      progress: '{{current}} / {{total}}',
    },

    discovery: {
      title: '발견',
      noMoreProfiles: '근처에 프로필이 더 이상 없습니다',
      expandSearch: '검색 범위 확대',
      refreshProfiles: '프로필 새로고침',
      distance: '{{distance}}km 떨어짐',
      online: '온라인',
      lastActive: '{{time}} 전 활동',
      verified: '인증됨',
      compatibility: '{{score}}% 일치',
      actions: {
        pass: '건너뛰기',
        like: '좋아요',
        superLike: '슈퍼 라이크',
        boost: '부스트',
        rewind: '되돌리기',
      },
    },

    matches: {
      title: '매치',
      newMatch: '매치되었습니다!',
      newMatchSubtitle: '{{name}}님과 서로 좋아요를 눌렀습니다',
      sendMessage: '메시지 보내기',
      keepSwiping: '계속 스와이프',
      noMatches: '아직 매치가 없습니다',
      startSwiping: '스와이프하여 매치를 찾으세요',
    },

    messages: {
      title: '메시지',
      noMessages: '아직 메시지가 없습니다',
      startConversation: '매치하여 대화를 시작하세요',
      typeMessage: '메시지 입력...',
      send: '전송',
      delivered: '전송됨',
      read: '읽음',
      typing: '입력 중...',
    },

    profile: {
      title: '프로필',
      editProfile: '프로필 편집',
      viewProfile: '프로필 보기',
      settings: '설정',
      premium: '프리미엄',
    },

    settings: {
      title: '설정',
      logout: '로그아웃',
      app: {
        title: '앱',
        language: '언어',
        theme: '테마',
      },
    },

    premium: {
      title: 'Flamoral 프리미엄',
      subtitle: '모든 기능 잠금 해제',
      plans: {
        price: '₩{{amount}}/월',
      },
    },

    time: {
      now: '방금',
      minutesAgo: '{{count}}분 전',
      hoursAgo: '{{count}}시간 전',
      daysAgo: '{{count}}일 전',
      today: '오늘',
      yesterday: '어제',
    },

    formatting: {
      currency: 'KRW',
      numberFormat: 'ko-KR',
      dateFormat: 'YYYY.MM.DD',
      timeFormat: '24h',
    },
  },
};

export default koKR;
