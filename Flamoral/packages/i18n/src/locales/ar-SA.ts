/**
 * Arabic (Saudi Arabia) translations
 * RTL (Right-to-Left) language
 */

export const arSA = {
  translation: {
    common: {
      continue: 'متابعة',
      back: 'رجوع',
      cancel: 'إلغاء',
      save: 'حفظ',
      delete: 'حذف',
      edit: 'تعديل',
      done: 'تم',
      skip: 'تخطي',
      next: 'التالي',
      previous: 'السابق',
      loading: 'جاري التحميل...',
      error: 'حدث خطأ ما',
      retry: 'إعادة المحاولة',
      confirm: 'تأكيد',
      yes: 'نعم',
      no: 'لا',
      ok: 'حسناً',
      search: 'بحث',
      filter: 'تصفية',
      sort: 'ترتيب',
      share: 'مشاركة',
      report: 'إبلاغ',
      block: 'حظر',
      unblock: 'إلغاء الحظر',
      mute: 'كتم',
      unmute: 'إلغاء الكتم',
    },

    auth: {
      welcome: 'مرحباً بك في فلامورال',
      tagline: 'حيث تزدهر الاتصالات المعنوية',
      signIn: 'تسجيل الدخول',
      signUp: 'التسجيل',
      signOut: 'تسجيل الخروج',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      confirmPassword: 'تأكيد كلمة المرور',
      forgotPassword: 'هل نسيت كلمة المرور؟',
      resetPassword: 'إعادة تعيين كلمة المرور',
      phoneNumber: 'رقم الهاتف',
      verifyCode: 'التحقق من الرمز',
      sendCode: 'إرسال الرمز',
      resendCode: 'إعادة إرسال الرمز',
      orContinueWith: 'أو المتابعة باستخدام',
      agreeToTerms: 'بالمتابعة، أنت توافق على',
      termsOfService: 'شروط الخدمة',
      and: 'و',
      privacyPolicy: 'سياسة الخصوصية',
      errors: {
        invalidEmail: 'الرجاء إدخال بريد إلكتروني صالح',
        invalidPassword: 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل',
        passwordMismatch: 'كلمات المرور غير متطابقة',
        invalidPhone: 'الرجاء إدخال رقم هاتف صالح',
        invalidCode: 'رمز التحقق غير صالح',
        emailInUse: 'البريد الإلكتروني مستخدم بالفعل',
        phoneInUse: 'رقم الهاتف مستخدم بالفعل',
        wrongCredentials: 'البريد الإلكتروني أو كلمة المرور خاطئة',
      },
    },

    onboarding: {
      steps: {
        name: {
          title: 'ما هو اسمك الأول؟',
          subtitle: 'هكذا ستظهر على فلامورال',
          placeholder: 'اسمك الأول',
          hint: 'لا يمكن تغيير هذا لاحقاً',
          error: {
            tooShort: 'الرجاء إدخال حرفين على الأقل',
            tooLong: 'يجب أن يكون الاسم أقل من 30 حرفاً',
            invalidChars: 'الرجاء استخدام الأحرف فقط',
          },
        },
        birthday: {
          title: 'متى عيد ميلادك، {{name}}؟',
          subtitle: 'سيتم عرض عمرك في ملفك الشخصي',
          hint: 'لا يمكن تغيير هذا لاحقاً',
          youAre: 'عمرك {{age}} سنة',
          error: {
            tooYoung: 'يجب أن يكون عمرك 18 سنة على الأقل',
            invalid: 'الرجاء إدخال تاريخ ميلاد صالح',
          },
        },
        gender: {
          title: 'ما هو جنسك؟',
          subtitle: 'هذا يساعدنا في إظهارك للأشخاص المناسبين',
          showOnProfile: 'إظهار في ملفي الشخصي',
          showOnProfileDesc: 'سيكون جنسك مرئياً للآخرين',
          options: {
            man: 'رجل',
            woman: 'امرأة',
            nonBinary: 'غير ثنائي',
            transgenderMan: 'رجل متحول جنسياً',
            transgenderWoman: 'امرأة متحولة جنسياً',
            other: 'آخر',
            preferNotToSay: 'أفضل عدم الإفصاح',
          },
        },
        interestedIn: {
          title: 'من تهتم به؟',
          subtitle: 'اختر خياراً واحداً أو أكثر',
          hint: 'يمكنك تغيير هذا لاحقاً في الإعدادات',
          options: {
            men: 'رجال',
            women: 'نساء',
            everyone: 'الجميع',
          },
        },
      },
      progress: '{{current}} من {{total}}',
    },

    discovery: {
      title: 'اكتشف',
      noMoreProfiles: 'لا مزيد من الملفات الشخصية القريبة',
      expandSearch: 'قم بتوسيع بحثك',
      refreshProfiles: 'تحديث الملفات الشخصية',
      distance: 'على بعد {{distance}} كم',
      online: 'متصل',
      lastActive: 'نشط منذ {{time}}',
      verified: 'موثق',
      compatibility: 'متوافق بنسبة {{score}}%',
      actions: {
        pass: 'تجاوز',
        like: 'إعجاب',
        superLike: 'إعجاب فائق',
        boost: 'تعزيز',
        rewind: 'تراجع',
      },
    },

    matches: {
      title: 'التطابقات',
      newMatch: 'إنه تطابق!',
      newMatchSubtitle: 'أنت و {{name}} أعجب كل منكما بالآخر',
      sendMessage: 'إرسال رسالة',
      keepSwiping: 'استمر في التصفح',
      noMatches: 'لا توجد تطابقات بعد',
      startSwiping: 'ابدأ التصفح للعثور على تطابقاتك',
    },

    messages: {
      title: 'الرسائل',
      noMessages: 'لا توجد رسائل بعد',
      startConversation: 'تطابق مع شخص ما لبدء المحادثة',
      typeMessage: 'اكتب رسالة...',
      send: 'إرسال',
      delivered: 'تم التسليم',
      read: 'مقروءة',
      typing: 'يكتب...',
    },

    profile: {
      title: 'الملف الشخصي',
      editProfile: 'تعديل الملف الشخصي',
      viewProfile: 'عرض الملف الشخصي',
      settings: 'الإعدادات',
      premium: 'مميز',
    },

    settings: {
      title: 'الإعدادات',
      logout: 'تسجيل الخروج',
      app: {
        title: 'التطبيق',
        language: 'اللغة',
        theme: 'المظهر',
      },
    },

    premium: {
      title: 'فلامورال المميز',
      subtitle: 'افتح التجربة الكاملة',
      plans: {
        price: '{{amount}} ر.س/شهر',
      },
    },

    time: {
      now: 'الآن',
      minutesAgo: 'منذ {{count}} دقيقة',
      hoursAgo: 'منذ {{count}} ساعة',
      daysAgo: 'منذ {{count}} يوم',
      today: 'اليوم',
      yesterday: 'أمس',
    },

    formatting: {
      currency: 'SAR',
      numberFormat: 'ar-SA',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
      dir: 'rtl',
    },
  },
};

export default arSA;
