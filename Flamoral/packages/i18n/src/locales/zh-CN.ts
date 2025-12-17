/**
 * Chinese (Simplified) translations
 */

export const zhCN = {
  translation: {
    common: {
      continue: '继续',
      back: '返回',
      cancel: '取消',
      save: '保存',
      delete: '删除',
      edit: '编辑',
      done: '完成',
      skip: '跳过',
      next: '下一步',
      previous: '上一步',
      loading: '加载中...',
      error: '出错了',
      retry: '重试',
      confirm: '确认',
      yes: '是',
      no: '否',
      ok: '好的',
      search: '搜索',
      filter: '筛选',
      sort: '排序',
      share: '分享',
      report: '举报',
      block: '屏蔽',
      unblock: '取消屏蔽',
      mute: '静音',
      unmute: '取消静音',
    },

    auth: {
      welcome: '欢迎来到 Flamoral',
      tagline: '有意义的连接在这里绽放',
      signIn: '登录',
      signUp: '注册',
      signOut: '退出',
      email: '电子邮箱',
      password: '密码',
      confirmPassword: '确认密码',
      forgotPassword: '忘记密码？',
      resetPassword: '重置密码',
      phoneNumber: '手机号码',
      verifyCode: '验证码',
      sendCode: '发送验证码',
      resendCode: '重新发送',
      orContinueWith: '或使用以下方式继续',
      agreeToTerms: '继续即表示您同意我们的',
      termsOfService: '服务条款',
      and: '和',
      privacyPolicy: '隐私政策',
      errors: {
        invalidEmail: '请输入有效的电子邮箱',
        invalidPassword: '密码至少需要8个字符',
        passwordMismatch: '密码不匹配',
        invalidPhone: '请输入有效的手机号码',
        invalidCode: '验证码无效',
        emailInUse: '电子邮箱已被使用',
        phoneInUse: '手机号码已被使用',
        wrongCredentials: '电子邮箱或密码错误',
      },
    },

    onboarding: {
      steps: {
        name: {
          title: '你的名字是什么？',
          subtitle: '这将是你在 Flamoral 上的显示名称',
          placeholder: '你的名字',
          hint: '之后无法更改，请确保正确',
          error: {
            tooShort: '请至少输入2个字符',
            tooLong: '名字必须少于30个字符',
            invalidChars: '请只使用字母',
          },
        },
        birthday: {
          title: '{{name}}，你的生日是什么时候？',
          subtitle: '你的年龄将显示在个人资料中',
          hint: '之后无法更改，请确保准确',
          youAre: '你今年{{age}}岁',
          error: {
            tooYoung: '你必须年满18岁',
            invalid: '请输入有效的出生日期',
          },
        },
        gender: {
          title: '你的性别是什么？',
          subtitle: '这有助于我们向合适的人展示你',
          showOnProfile: '在我的个人资料中显示',
          showOnProfileDesc: '你的性别将对其他人可见',
          options: {
            man: '男性',
            woman: '女性',
            nonBinary: '非二元性别',
            transgenderMan: '跨性别男性',
            transgenderWoman: '跨性别女性',
            other: '其他',
            preferNotToSay: '不愿透露',
          },
        },
        interestedIn: {
          title: '你对谁感兴趣？',
          subtitle: '选择一个或多个选项',
          hint: '你可以稍后在设置中更改',
          options: {
            men: '男性',
            women: '女性',
            everyone: '所有人',
          },
        },
      },
      progress: '{{current}} / {{total}}',
    },

    discovery: {
      title: '发现',
      noMoreProfiles: '附近没有更多用户了',
      expandSearch: '扩大搜索范围',
      refreshProfiles: '刷新用户',
      distance: '距离{{distance}}公里',
      online: '在线',
      lastActive: '{{time}}前活跃',
      verified: '已认证',
      compatibility: '{{score}}% 匹配',
      actions: {
        pass: '跳过',
        like: '喜欢',
        superLike: '超级喜欢',
        boost: '加速',
        rewind: '撤销',
      },
    },

    matches: {
      title: '配对',
      newMatch: '配对成功！',
      newMatchSubtitle: '你和 {{name}} 互相喜欢',
      sendMessage: '发送消息',
      keepSwiping: '继续浏览',
      noMatches: '还没有配对',
      startSwiping: '开始浏览以寻找配对',
    },

    messages: {
      title: '消息',
      noMessages: '还没有消息',
      startConversation: '与某人配对后开始聊天',
      typeMessage: '输入消息...',
      send: '发送',
      delivered: '已送达',
      read: '已读',
      typing: '正在输入...',
    },

    profile: {
      title: '个人资料',
      editProfile: '编辑资料',
      viewProfile: '查看资料',
      settings: '设置',
      premium: '高级会员',
    },

    settings: {
      title: '设置',
      logout: '退出登录',
      app: {
        title: '应用',
        language: '语言',
        theme: '主题',
      },
    },

    premium: {
      title: 'Flamoral 高级会员',
      subtitle: '解锁完整体验',
      plans: {
        price: '¥{{amount}}/月',
      },
    },

    time: {
      now: '刚刚',
      minutesAgo: '{{count}}分钟前',
      hoursAgo: '{{count}}小时前',
      daysAgo: '{{count}}天前',
      today: '今天',
      yesterday: '昨天',
    },

    formatting: {
      currency: 'CNY',
      numberFormat: 'zh-CN',
      dateFormat: 'YYYY/MM/DD',
      timeFormat: '24h',
    },
  },
};

export default zhCN;
