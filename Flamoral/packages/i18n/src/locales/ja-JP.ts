/**
 * Japanese (Japan) translations
 */

export const jaJP = {
  translation: {
    common: {
      continue: '続ける',
      back: '戻る',
      cancel: 'キャンセル',
      save: '保存',
      delete: '削除',
      edit: '編集',
      done: '完了',
      skip: 'スキップ',
      next: '次へ',
      previous: '前へ',
      loading: '読み込み中...',
      error: 'エラーが発生しました',
      retry: '再試行',
      confirm: '確認',
      yes: 'はい',
      no: 'いいえ',
      ok: 'OK',
      search: '検索',
      filter: 'フィルター',
      sort: '並び替え',
      share: '共有',
      report: '報告',
      block: 'ブロック',
      unblock: 'ブロック解除',
      mute: 'ミュート',
      unmute: 'ミュート解除',
    },

    auth: {
      welcome: 'Flamoral へようこそ',
      tagline: '意味のあるつながりが咲く場所',
      signIn: 'ログイン',
      signUp: '新規登録',
      signOut: 'ログアウト',
      email: 'メールアドレス',
      password: 'パスワード',
      confirmPassword: 'パスワード確認',
      forgotPassword: 'パスワードをお忘れですか？',
      resetPassword: 'パスワードをリセット',
      phoneNumber: '電話番号',
      verifyCode: '確認コード',
      sendCode: 'コードを送信',
      resendCode: '再送信',
      orContinueWith: 'または次の方法で続行',
      agreeToTerms: '続行することで、以下に同意したことになります',
      termsOfService: '利用規約',
      and: 'および',
      privacyPolicy: 'プライバシーポリシー',
      errors: {
        invalidEmail: '有効なメールアドレスを入力してください',
        invalidPassword: 'パスワードは8文字以上である必要があります',
        passwordMismatch: 'パスワードが一致しません',
        invalidPhone: '有効な電話番号を入力してください',
        invalidCode: '確認コードが無効です',
        emailInUse: 'このメールアドレスは既に使用されています',
        phoneInUse: 'この電話番号は既に使用されています',
        wrongCredentials: 'メールアドレスまたはパスワードが間違っています',
      },
    },

    onboarding: {
      steps: {
        name: {
          title: 'お名前は何ですか？',
          subtitle: 'Flamoral での表示名になります',
          placeholder: 'あなたの名前',
          hint: '後で変更できませんので、正確に入力してください',
          error: {
            tooShort: '2文字以上入力してください',
            tooLong: '名前は30文字未満である必要があります',
            invalidChars: '文字のみ使用してください',
          },
        },
        birthday: {
          title: '{{name}}さん、お誕生日はいつですか？',
          subtitle: 'あなたの年齢がプロフィールに表示されます',
          hint: '後で変更できませんので、正確に入力してください',
          youAre: 'あなたは{{age}}歳です',
          error: {
            tooYoung: '18歳以上である必要があります',
            invalid: '有効な生年月日を入力してください',
          },
        },
        gender: {
          title: '性別は何ですか？',
          subtitle: '適切な相手を表示するために使用されます',
          showOnProfile: 'プロフィールに表示',
          showOnProfileDesc: 'あなたの性別が他のユーザーに表示されます',
          options: {
            man: '男性',
            woman: '女性',
            nonBinary: 'ノンバイナリー',
            transgenderMan: 'トランスジェンダー男性',
            transgenderWoman: 'トランスジェンダー女性',
            other: 'その他',
            preferNotToSay: '回答しない',
          },
        },
        interestedIn: {
          title: '誰に興味がありますか？',
          subtitle: '1つ以上のオプションを選択',
          hint: '後で設定で変更できます',
          options: {
            men: '男性',
            women: '女性',
            everyone: 'すべて',
          },
        },
      },
      progress: '{{current}} / {{total}}',
    },

    discovery: {
      title: '発見',
      noMoreProfiles: '近くにプロフィールがありません',
      expandSearch: '検索範囲を拡大',
      refreshProfiles: 'プロフィールを更新',
      distance: '{{distance}}km離れています',
      online: 'オンライン',
      lastActive: '{{time}}前にアクティブ',
      verified: '認証済み',
      compatibility: '{{score}}%の相性',
      actions: {
        pass: 'スキップ',
        like: 'いいね',
        superLike: 'スーパーライク',
        boost: 'ブースト',
        rewind: '元に戻す',
      },
    },

    matches: {
      title: 'マッチ',
      newMatch: 'マッチしました！',
      newMatchSubtitle: 'あなたと{{name}}さんがお互いにいいねしました',
      sendMessage: 'メッセージを送る',
      keepSwiping: 'スワイプを続ける',
      noMatches: 'まだマッチがありません',
      startSwiping: 'スワイプしてマッチを見つけましょう',
    },

    messages: {
      title: 'メッセージ',
      noMessages: 'まだメッセージがありません',
      startConversation: 'マッチしてチャットを始めましょう',
      typeMessage: 'メッセージを入力...',
      send: '送信',
      delivered: '配信済み',
      read: '既読',
      typing: '入力中...',
    },

    profile: {
      title: 'プロフィール',
      editProfile: 'プロフィール編集',
      viewProfile: 'プロフィール表示',
      settings: '設定',
      premium: 'プレミアム',
    },

    settings: {
      title: '設定',
      logout: 'ログアウト',
      app: {
        title: 'アプリ',
        language: '言語',
        theme: 'テーマ',
      },
    },

    premium: {
      title: 'Flamoral プレミアム',
      subtitle: 'フル機能をアンロック',
      plans: {
        price: '¥{{amount}}/月',
      },
    },

    time: {
      now: 'たった今',
      minutesAgo: '{{count}}分前',
      hoursAgo: '{{count}}時間前',
      daysAgo: '{{count}}日前',
      today: '今日',
      yesterday: '昨日',
    },

    formatting: {
      currency: 'JPY',
      numberFormat: 'ja-JP',
      dateFormat: 'YYYY/MM/DD',
      timeFormat: '24h',
    },
  },
};

export default jaJP;
