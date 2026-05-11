const Config = {
        get API_BASE_URL() {
            return 'https://lucid-manifestation-production-c302.up.railway.app';
        }
    };

// 2. ثم يبدأ تطبيقك بشكل طبيعي
const App = (() => {
    'use strict';
    // (تم إزالة Config من هنا)
    
    const AppEvents = (() => {
        const events = {};
        window.addEventListener('beforeunload', () => {
            if (events['STOP_ALL_PROCESSES']) events['STOP_ALL_PROCESSES'].forEach(cb => cb());
        });
        return {
            on: (event, callback) => { if (!events[event]) events[event] = []; events[event].push(callback); },
            emit: (event, data) => { if (events[event]) events[event].forEach(cb => cb(data)); }
        };
    })();

    const NetworkManager = (() => {
        const baseFetch = async (endpoint, options = {}, isAuthRequired = false) => {
            const url = `${Config.API_BASE_URL}${endpoint}`;
            const headers = { 'Content-Type': 'application/json', ...options.headers };
            if (isAuthRequired) {
                const token = localStorage.getItem('music_factory_token');
                if (token) headers['Authorization'] = `Bearer ${token}`;
            }
            try {
                const response = await fetch(url, { ...options, headers });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    if ((response.status === 401 || response.status === 403) && isAuthRequired) {
                        localStorage.removeItem('music_factory_token');
                        localStorage.removeItem('music_factory_user');
                        throw new Error("SESSION_EXPIRED");
                    }
                    throw new Error(errorData.error || errorData.message || "حدث خطأ من الخادم");
                }
                return await response.json();
            } catch (error) { throw error; }
        };
        return {
            publicFetch: (endpoint, options) => baseFetch(endpoint, options, false),
            authenticatedFetch: (endpoint, options) => baseFetch(endpoint, options, true)
        };
    })();

    const AuthManager = (() => {
        return {
            saveAuth: (token, userData) => {
                localStorage.setItem('music_factory_token', token);
                localStorage.setItem('music_factory_user', JSON.stringify(userData));
            },
            logout: () => {
                localStorage.removeItem('music_factory_token');
                localStorage.removeItem('music_factory_user');
                location.reload();
            }
        };
    })();

    const Utils = {
        debounce: (func, wait) => {
            let timeout;
            return function (...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }
    };

    const SecurityManager = (() => {
        const htmlEscapes = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        const reUnescapedHtml = /[&<>"']/g;
        const reHasUnescapedHtml = RegExp(reUnescapedHtml.source);
        return {
            escapeHTML: (string) => {
                return (string && reHasUnescapedHtml.test(string))
                    ? string.replace(reUnescapedHtml, (chr) => htmlEscapes[chr])
                    : (string || '');
            }
        }
    })();

    const StorageManager = (() => {
        return {
            save: (key, data) => {
                try { localStorage.setItem(key, typeof data === 'object' ? JSON.stringify(data) : data); }
                catch (e) { console.warn("Storage quota exceeded or unavailable.", e); }
            },
            load: (key, fallback = null) => {
                try {
                    const item = localStorage.getItem(key);
                    if (!item) return fallback;
                    try { return JSON.parse(item); } catch (e) { return item; }
                } catch (e) { return fallback; }
            },
            remove: (key) => {
                try { localStorage.removeItem(key); } catch (e) { }
            }
        };
    })();

    window.UIController = (() => {
        const DOM = {};
        return {
            cacheDOM: () => {
                const ids = [
                    'screenBtn', 'themeBtn', 'settingsBtn', 'settingsPage', 'closeSettingsBtn',
                    'logoBox', 'dropZone', 'fileInput', 'browseFileBtn', 'chorus', 'v1', 'v2', 'outro', 'outroDropdown', 'introDropdown',
                    'p_rhythm', 'p_feeling', 'p_vocals', 'p_tempo', 'manualTempo', 'p_maqam', 'p_rhythmic_mode', 'p_instrumentation', 'p_track_type', 'p_duration',
                    'out_lyrics', 'out_style', 'out_full', 'toast', 'profilePicInput', 'profilePicPreview',
                    'langSelect', 'primaryColorPicker', 'fontSizeSlider', 'mainTabsNav', 'radioVocal', 'radioInst',
                    'lyricsSection', 'vocalPillar', 'lyricsOutputWrapper', 'nextToMelodyBtn', 'generatePromptBtn',
                    'clearFieldsBtn', 'restoreFieldsBtn', 'downloadMp3Btn', 'mp3Quality', 'dynamicGenerateBtn',
                    'openSunoBtn', 'settingsNav', 'creditCountSettings', 'cCount', 'v1Count', 'v2Count', 'oCount', 'outCountL',
                    'promptLibrarySelect', 'ob-next', 'ob-back', 'ob-skip', 'ob-finish', 'onboardingOverlay',
                    'accPasswordInput', 'togglePasswordBtn', 'dynGenText', 'enableShortcutsCheck', 'advancedOverrideToggle',
                    'navBackBtn',
                    'statusText',
                    'audioPlayer',
                    'downloadBtn',
                    'loginBtn',
                    'accEmailInput'
                ];
                ids.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) DOM[id] = el;
                });
                DOM.tabBtns = document.querySelectorAll('.tab-btn');
                DOM.tabContents = document.querySelectorAll('.tab-content');
                DOM.settingsSidebarBtns = document.querySelectorAll('.settings-sidebar button');
                DOM.settingsSections = document.querySelectorAll('.settings-section');
                DOM.accordions = document.querySelectorAll('.accordion');
                DOM.lyricInputs = document.querySelectorAll('.lyric-input');
                DOM.autoSaveTriggers = document.querySelectorAll('.auto-save-trigger');
                DOM.copyBtns = document.querySelectorAll('.copy-btn');
                DOM.obSteps = document.querySelectorAll('.ob-step');
                DOM.outputContents = document.querySelectorAll('.output-content');
            },
            getDOM: () => DOM
        };
    })();

    const TranslationEngine = (() => {
        const dicts = {
            ar: {
                ast_thinking: "... جاري التفكير", ast_error: "عذراً، فشل الاتصال بالمايسترو.",
                app_title: "Music Factory AI", btn_fullscreen: "تكبير الشاشة", btn_fullscreen_exit: "تصغير الشاشة",
                tab_lyrics: "إنشاء مشروع جديد", tab_melody: "الاستوديو", tab_outputs: "الإخراج", tab_guide: "دليل المستخدم",
                mode_vocal: "تلحين كلمات غنائية", mode_inst: "تلحين موسيقى تصويرية", sec_lyrics: "إدخال وتوزيع الكلمات الغنائية📝",
                drop_title: "اسحب ملف الكلمات هنا بالصيغ المدعومة", drop_hint: "ويُفضل أن تكون بصيغة Word وأن تكون الكلمات مقسمة إلى مذهب وكوبليه أول وكوبليه ثاني (اختياري)",
                drop_btn: "أو تصفح الملفات", lbl_chorus: "المذهب (Chorus)", lbl_v1: "الكوبليه الأول (Verse 1)",
                lbl_v2: "الكوبليه الثاني (Verse 2)", lbl_outro: "الخاتمة (Outro)", tt_outro: "القفلة الموسيقية تحدد كيف تنتهي الأغنية.",
                lbl_intro: "المقدمة (Intro)", tt_intro: "المقدمة الموسيقية تحدد كيف تبدأ الأغنية.",
                tt_rhythm: "يحدد الإيقاع الأساسي للأغنية.", tt_mood: "يحدد الإحساس العام للموسيقى.", tt_maqam: "السلم الموسيقي الشرقي للخبراء.",
                btn_save_project: "       💾       احفظ المشروع", opt_saved_projects: "-- المشاريع المحفوظة --", btn_load_project: "       📂       افتح مشروع",
                pl_chorus: "اكتب كلمات المذهب هنا...", pl_v1: "اكتب كلمات الكوبليه الأول...", pl_v2: "أكتب كلمات الكوبليه الثاني...", pl_outro: "كلمات الخاتمة (اختياري)...",
                btn_next_melody: "اضغط للانتقال إلى استوديو التلحين والتوزيع", sec_pillars: "استديو التحكم في اللحن والتوزيع للمتخصصين",
                p1: "1. الإيقاع والاستايل", p2: "2. المود والإحساس", p3: "3. صوت المغني", p4: "4. السرعة (التمبو)", p5: "5. المقام (للمحترفين)",
                p_rhythmic_mode: "النمط الإيقاعي", p_inst: "الآلات الموسيقية", p_track_type: "نوع المقطوعة", p_duration: "المدة الزمنية",
                opt_rhythmic: "إيقاعي (Rhythmic)", opt_ambient: "محيطي (Ambient)", opt_hybrid: "مدمج (Hybrid)", opt_cue: "مقطوعة قصيرة (Cue)", opt_loop: "تكرار مستمر (Loop)", opt_full: "مقطوعة كاملة (Full Track)",
                opt_no_rhythm: "بدون إيقاع (No Rhythm)", p_inst_orchestra: "التوزيع الآلي (Orchestration)",
                btn_generate: "           🪄            اضغط لتوليد اللحن Enter", sec_output: "           💿            معرض مخرجات Music Factory",
                sec_export_others: "           💿            التصدير إلى مولدات أخرى",
                out_lyrics_lbl: "1. برومبت الكلمات (Lyrics)", out_style_lbl: "2. برومبت الستايل (Styles)",
                out_full_lbl: "3. البرومبت الشامل (Full Engine)", btn_copy_lyrics: "           📋            نسخ الكلمات", btn_copy_style: "           📋            نسخ الستايل",
                btn_copy_full: "           📋            نسخ البرومبت الشامل", btn_apk: "           🎧            اضغط لتوليد الأغنية (APK)", btn_clear: "           🗑️            مشروع جديد (امسح كل حاجة)", btn_restore: "           ↩️    \n        استرجاع (Ctrl+Z)",
                btn_dyn_gen_song: "           🎧            إضغط لتوليد الأغنية", btn_dyn_gen_melody: "           🎧            إضغط لتوليد اللحن",
                sec_guide: "           📘            دليل المستخدم (FAQ)", mp3_download_title: "تحميل بصيغة MP3", btn_download_mp3: "           ⬇️            تحميل الأغنية",
                toast_copied: "           ✅            تم النسخ بنجاح!", toast_failed: "           ❌            فشل النسخ", toast_cleared: "           🗑️            تم مسح الخانات!", toast_restored: "           ↩️        \n    تم استرجاع البيانات بنجاح!", toast_saved: "       \n            💾            تم حفظ البيانات محلياً",
                settings_title: "           ⚙️            الإعدادات", sec_support: "           🎧            الدعم الفني و FAQ", set_account: "           👤            الحساب", set_appearance: "           🎨          \n  المظهر", set_notifications: "    \n       🔔     \n        الإشعارات", set_privacy: "           🔒            الخصوصية والأمان", set_data: "           💾            البيانات والتخزين", set_credits: "الرصيد والاستخدام",
                app_lang: "اللغة (Language)", processing: "جارٍ المعالجة الهندسية...",
                guide_about: "عن Music Factory", guide_about_desc: "منصة متقدمة لهندسة الأوامر البرمجية الموسيقية. تحول كلماتك لأغاني احترافية.",
                guide_q2: "ازاي استخدم الموقع؟", guide_a2: "1. اكتب كلماتك أو اسحب ملف.<br>2. اختار المقدمة والنهاية.<br>3. روح للاستوديو وظبط الإيقاع والمود.<br>4. اضغط توليد وانسخ النتيجة.",
                guide_q3: "ما هي اختصارات لوحة المفاتيح المتاحة؟", guide_a3: "لضمان سرعة العمل، يمكنك استخدام الاختصارات التالية:<br>- <b>Enter</b>: لتوليد اللحن مباشرة.<br>- <b>Ctrl + S</b>: لحفظ البيانات الحالية.<br>- <b>Ctrl + Z</b> أو <b>Ctrl + Y</b>: للتراجع واسترجاع البيانات الممسوحة.",
                guide_q4: "ما هو \"محرك الخاتمة\" (Outro Engine)؟", guide_a4: "هو ميزة ذكية تحدد كيف تنتهي موسيقاك. بدلاً من النهايات العشوائية، يمكنك تحديد ما إذا كنت تريد أن يتلاشى الصوت تدريجياً، أو يتوقف فجأة، أو ينتهي بعزف منفرد (صولو) يضفي طابعاً احترافياً لأغنيتك.",
                guide_q5: "ما هو الوضع التلقائي (Auto Theme)؟", guide_a5: "يقوم الوضع التلقائي بتغيير المظهر بين الفاتح والداكن بسلاسة حسب وقت جهازك المحلي (فاتح من 06:00 إلى 17:59، وداكن من 18:00 إلى 05:59).",
                guide_terms: "الشروط والأحكام", guide_terms_desc: "استخدامك للمنصة يعني موافقتك على حقوق الملكية الفكرية للقوانين المحلية. المخرجات مخصصة للاستخدام الشخصي.",
                guide_privacy: "سياسة الخصوصية", guide_privacy_desc: "تتم معالجة الكلمات والبيانات محلياً في متصفحك. لا يتم حفظ أي بيانات على سيرفرات خارجية.",
                guide_report: "الإبلاغ عن مشكلة", guide_report_desc: "في حال واجهت أي مشكلة، يرجى التواصل مع الدعم عبر: hussien.elmalek@gmail.com",
                guide_suggest: "إرسال اقتراح", guide_suggest_desc: "نرحب بأفكارك! راسلنا للمساهمة في تطوير المنصة.",
                theme_light: "Light", theme_dark: "Dark", theme_auto: "Auto",
                footer_rights: "حقوق الملكية الفكرية محفوظة", toast_download_success: "           ✅            تم تحميل الموسيقى!",
                og_egyptian: "مصري", opt_maqsum: "مقسوم مصري", opt_saidi: "صعيدي حماسي", opt_fallahi: "فلاحي", opt_baladi: "بلدي أصيل", opt_ayoub: "أيوب (زار)", opt_mahraganat: "مهرجانات", opt_trap: "راب مصري", opt_fox: "فوكس", opt_malfuf: "ملفوف",
                og_omani: "عماني", opt_razha: "رزحة", opt_bara: "برعة",
                og_gulf: "خليجي", opt_pop_khaliji: "بوب خليجي / بندري", opt_samri: "سامري خليجي",
                og_shami: "شامي", opt_dabke: "دبكة شامي",
                og_fusha: "وقار / فصحى", opt_military_march: "مارش عسكري", opt_school_march: "مارش مدرسي", opt_wahda_kabira: "وحدة كبيرة", opt_waltz: "فالس عربي",
                og_joyful: "إيجابي / مبهج", opt_joyful: "مرح ومبهج", opt_danceable: "راقص", opt_festive: "احتفالي", opt_uplifting: "محفز",
                og_sad: "شجي / عاطفي", opt_romantic: "رومانسي", opt_sad: "حزين وشجي", opt_tragic: "مأساوي", opt_nostalgic: "حنين",
                og_epic: "قوي / درامي", opt_proud: "فخور", opt_powerful: "قوي وحماسي", opt_epic: "درامي ملحمي",
                opt_male: "صوت رجالي", opt_female: "صوت نسائي", opt_boy: "صوت طفل", opt_girl: "صوت ط طفلة", opt_child_choir: "كورال أطفال", opt_male_choir: "كورال رجال", opt_group: "هارموني جماعي", opt_poetry: "إلقاء شعري", opt_operatic: "صوت أوبرالي", opt_raspy: "صوت مبحوح",
                opt_auto_tempo: "تلقائي (حسب الإيقاع)", opt_slow: "بطيء (60 - 85)", opt_medium: "متوسط (90 - 115)", opt_fast: "سريع (120 - 140)", opt_manual: "إدخال رقمي يدوي...",
                opt_auto_maqam: "تلقائي (الذكاء هيختار الأنسب)", opt_bayati: "بياتي (Bayati)", opt_rast: "راست (Rast)", opt_ajam: "عجم (Ajam)", opt_nahawand: "نهاوند (Nahawand)", opt_kurd: "كرد (Kurd)", opt_hijaz: "حجاز (Hijaz)", opt_saba: "صبا (Saba)", opt_sikah: "سيكا (Sikah)",
                opt_intro_auto: "           🪄            سيبها للذكاء الاصطناعي", opt_intro_long: "           🎻            مقدمة موسيقية طويلة", opt_intro_sudden: "           ⚡            خبطة لزق (بدون مقدمة)", opt_intro_build: "           📈      \n       بناء تدريجي (تصاعدي)", opt_intro_perc: "      \n     🥁            مقدمة إيقاعية (طبلة/درامز)", opt_intro_vocal: "           🎤            مقدمة غنائية (آهات/كورال)",
                opt_outro_auto: "           🪄            نهاية من اقتراح المايسترو", opt_outro_fade: "           📉            بتوطى بالتدريج (Fade-out)", opt_outro_stop: "           🛑            قفلة فجأة", opt_outro_epic: "           🏛️       \n      نهاية فخمة (ملحمية)", opt_outro_soft: "       \n    🍃            هدوء تام (نهاية ناعمة)", opt_outro_crescendo: "           📈            زيادة الحماس (تصاعد)", opt_outro_vocal: "           🎤         ارتجال غنائي (آهات)", opt_outro_solo: "           🎻 \n           عزف منفرد (صولو)",
                opt_mp3_128: "جودة قياسية (128 kbps)", opt_mp3_256: "جودة عالية (256 kbps)", opt_mp3_320: "جودة استوديو (320 kbps)",
                footer_dev: "فكرة وبرمجة: حسين الملك", acc_security: "أمان الحساب", acc_password: "كلمة المرور:", acc_picture: "الصورة الشخصية:", acc_logout: "تسجيل الخروج",
                app_shortcuts: "اختصارات لوحة المفاتيح", app_shortcuts_toggle: "تفعيل الاختصارات",
                notif_enable: "تفعيل الإشعارات", notif_sounds: "تنبيهات صوتية", notif_types: "أنواع الإشعارات", notif_all: "الكل", notif_important: "المهمة فقط", notif_dnd: "وضع عدم الإزعاج",
                priv_2fa: "التحقق بخطوتين", priv_setup: "إعداد", priv_applock: "قفل التطبيق", priv_permissions: "الصلاحيات", priv_manage: "إدارة", priv_devices: "الأجهزة المتصلة", priv_view: "عرض (1)",
                data_cache: "مسح الكاش (Cache)", data_clear: "مسح", data_optimize: "تحسين استهلاك البيانات", data_backup: "النسخ الاحتياطي التلقائي", data_files: "إدارة الملفات", data_manage: "إدارة",
                set_accessibility: "           ♿            إمكانية الوصول", accs_zoom: "تكبير النص", accs_contrast: "وضع التباين العالي", accs_reader: "دعم قارئ الشاشة", accs_keys: "تخصيص",
                limit_reached: "لقد بلغت سقف استخدام النموذج.",
                ob_welcome: "مرحباً بك في Music Factory", ob_welcome_desc: "أداتك الاحترافية لهندسة أوامر الذكاء الاصطناعي الموسيقي.",
                ob_lyrics: "1. إدخال الكلمات", ob_lyrics_desc: "أدخل كلماتك أو اسحب ملف نصي لتوزيعه تلقائياً.",
                ob_melody: "2. الأستديو", ob_melody_desc: "اختر الإيقاع والمزاج من استديو التحكم، أو استخدم مكتبة الأنماط الجاهزة.",
                ob_generate: "3. توليد البرومبت", ob_generate_desc: "اضغط لتوليد الأوامر الجاهزة لاستخدامها في Suno AI!",
                ob_skip: "تخطي", ob_back: "السابق", ob_next: "التالي", ob_finish: "إنهاء",
                sec_prompt_lib: "           📚            مكتبة الأنماط الجاهزة لغير المتخصصين", opt_lib_custom: "تصميم مخصص...", opt_lib_pop: "بوب (Pop)", opt_lib_cinematic: "سينمائي (Cinematic)", opt_lib_epic: "مقطوعة ملحمية (Epic Trailer)", opt_lib_ambient: "موسيقى هادئة (Ambient)", opt_lib_lofi: "لوفي (Lofi)", opt_lib_arabic_pop: "بوب عربي (Arabic Pop)", opt_lib_emotional: "بيانو عاطفي (Emotional Piano)", opt_lib_orchestral: "أوركسترا (Orchestral Score)",
                cat_scene: "نوع المشهد:", cat_dialogue: "وجود حوار:", cat_density: "كثافة الموسيقى:",
                nav_home: "الرئيسية", nav_studio: "الاستوديو", nav_production: "الإخراج", nav_community: "مجتمعي", nav_my_project: "مشروعي"
            },
            en: {
                ast_thinking: "... Thinking", ast_error: "Sorry, connection to Maestro failed.",
                app_title: "Music Factory AI", btn_fullscreen: "Fullscreen", btn_fullscreen_exit: "Exit Fullscreen",
                tab_lyrics: "Create Music Project", tab_melody: "Studio", tab_outputs: "Output Gallery", tab_guide: "User Guide",
                mode_vocal: "Vocal Track", mode_inst: "Instrumental Only", sec_lyrics: "Lyrics Engine",
                drop_title: "Drag & Drop lyrics file here (.txt, .json)", drop_hint: "Will auto-distribute to sections",
                drop_btn: "Or browse files", lbl_chorus: "Chorus", lbl_v1: "Verse 1",
                lbl_v2: "Verse 2", lbl_outro: "Outro", tt_outro: "The outro dictates how your track concludes.",
                lbl_intro: "Intro", tt_intro: "The intro dictates how your track begins.",
                tt_rhythm: "Defines the core rhythm of the track.", tt_mood: "Sets the emotional atmosphere.", tt_maqam: "Oriental scale for advanced tuning.",
                btn_save_project: "      💾       Save Project", opt_saved_projects: "-- Saved Projects --", btn_load_project: "      📂       Load Project",
                pl_chorus: "Type chorus lyrics here...", pl_v1: "Type Verse 1...", pl_v2: "Type Verse 2 lyrics...", pl_outro: "Outro lyrics (optional)...",
                btn_next_melody: "Go to Composition & Arrangement Studio →", sec_pillars: "Advanced Studio for Composition & Arrangement",
                p1: "1. Rhythm & Style", p2: "2. Mood & Feeling", p3: "3. Vocalist", p4: "4. Tempo (BPM)", p5: "5. Maqam (Pro)",
                p_rhythmic_mode: "Rhythmic Mode", p_inst: "Instrumentation", p_track_type: "Track Type", p_duration: "Duration",
                opt_rhythmic: "Rhythmic", opt_ambient: "Ambient", opt_hybrid: "Hybrid", opt_cue: "Cue (Short)", opt_loop: "Seamless Loop", opt_full: "Full Track",
                opt_no_rhythm: "No Rhythm (Free Timing)", p_inst_orchestra: "Orchestration & Instruments",
                btn_generate: "           🪄            Generate Prompt (Enter)", sec_output: "           💿            Music Factory Output Gallery",
                sec_export_others: "           💿            Export to Other Generators",
                out_lyrics_lbl: "1. Lyrics Prompt", out_style_lbl: "2. Style Prompt",
                out_full_lbl: "3. Full Engine Prompt", btn_copy_lyrics: "           📋            Copy Lyrics", btn_copy_style: "           📋            Copy Style",
                btn_copy_full: "           📋            Copy Full Prompt", btn_apk: "           🎧            Generate App Track (APK)", btn_clear: "           🗑️            Reset / New Project", btn_restore: "           ↩️     \n       Restore (Ctrl+Z)",
                btn_dyn_gen_song: "           🎧            Generate Song", btn_dyn_gen_melody: "           🎧            Generate Melody",
                sec_guide: "           📘            Help Center & FAQ", mp3_download_title: "Download MP3", btn_download_mp3: "           ⬇️            Download Track",
                toast_copied: "           ✅            Copied successfully!", toast_failed: "           ❌            Copy failed", toast_cleared: "           🗑️            Fields cleared!", toast_restored: "           ↩️          \n  Data restored successfully!", toast_saved: "  \n         💾   \n         Data saved locally",
                settings_title: "           ⚙️            Settings", sec_support: "           🎧            Support & FAQ", set_account: "           👤            Account", set_appearance: "           🎨           \n  Appearance", set_notifications: "     \n       🔔      \n      Notifications", set_privacy: "           🔒            Privacy & Security", set_data: "           💾            Data & Storage", set_credits: "Credits & Usage",
                app_lang: "Language", processing: "Engineering in progress...",
                guide_about: "About Music Factory", guide_about_desc: "An advanced tool designed for engineering AI music prompts. Turn words into musical structures instantly.",
                guide_q2: "User Guide", guide_a2: "1. Enter lyrics or drag a file to auto-distribute.<br>2. Select your preferred intro and outro.<br>3. Go to Studio and pick rhythm, mood, and maqam.<br>4. Generate and copy outputs.",
                guide_q3: "Keyboard Shortcuts", guide_a3: "- <b>Enter</b>: Generate prompt.<br>- <b>Ctrl + S</b>: Save data.<br>- <b>Ctrl + Z</b> or <b>Ctrl + Y</b>: Undo/Restore.",
                guide_q4: "Outro Engine Explanation", guide_a4: "A smart feature defining your song's conclusion. Choose to fade out, stop abruptly, or end with a solo for a professional touch.",
                guide_q5: "Auto Theme Explanation", guide_a5: "Auto Mode seamlessly switches your interface between Light and Dark themes based on your device's local time (Light from 06:00 to 17:59, and Dark from 18:00 to 05:59).",
                guide_terms: "Terms & Conditions", guide_terms_desc: "By using this software, you comply with local copyright laws. Generated outputs are for your use.",
                guide_privacy: "Privacy Policy", guide_privacy_desc: "All lyrics and prompt data are processed locally in your browser. No data is stored on remote servers.",
                guide_report: "Report a Problem", guide_report_desc: "If you encounter an issue, please contact support at hussien.elmalek@gmail.com.",
                guide_suggest: "Send Suggestions", guide_suggest_desc: "We welcome your ideas! Email us to help improve Music Factory.",
                theme_light: "Light", theme_dark: "Dark", theme_auto: "Auto",
                footer_rights: "All Rights Reserved", toast_download_success: "           ✅            Music downloaded successfully!",
                og_egyptian: "Egyptian", opt_maqsum: "Egyptian Maqsum", opt_saidi: "Energetic Saidi", opt_fallahi: "Fallahi", opt_baladi: "Authentic Baladi", opt_ayoub: "Ayoub (Zar)", opt_mahraganat: "Mahraganat", opt_trap: "Egyptian Trap", opt_fox: "Fox", opt_malfuf: "Malfuf",
                og_omani: "Omani", opt_razha: "Razha", opt_bara: "Bara'a",
                og_gulf: "Khaleeji", opt_pop_khaliji: "Khaleeji Pop / Bandari", opt_samri: "Khaleeji Samri",
                og_shami: "Levantine", opt_dabke: "Levantine Dabke",
                og_fusha: "Formal / Classical", opt_military_march: "Military March", opt_school_march: "School March", opt_wahda_kabira: "Wahda Kabira", opt_waltz: "Arabic Waltz",
                og_joyful: "Positive / Joyful", opt_joyful: "Joyful & Cheerful", opt_danceable: "Danceable", opt_festive: "Festive", opt_uplifting: "Uplifting",
                og_sad: "Melancholic / Emotional", opt_romantic: "Romantic", opt_sad: "Sad & Melancholic", opt_tragic: "Tragic", opt_nostalgic: "Nostalgic",
                og_epic: "Powerful / Dramatic", opt_proud: "Proud", opt_powerful: "Powerful & Intense", opt_epic: "Epic Dramatic",
                opt_male: "Male Vocal", opt_female: "Female Vocal", opt_boy: "Young Boy Vocal", opt_girl: "Young Girl Vocal", opt_child_choir: "Children Choir", opt_male_choir: "Male Choir", opt_group: "Group Harmony", opt_poetry: "Poetry Recitation", opt_operatic: "Operatic Vocal", opt_raspy: "Raspy Vocal",
                opt_auto_tempo: "Auto (Based on Rhythm)", opt_slow: "Slow (60 - 85)", opt_medium: "Medium (90 - 115)", opt_fast: "Fast (120 - 140)", opt_manual: "Manual Digital Input...",
                opt_auto_maqam: "Auto (AI Choice)", opt_bayati: "Bayati", opt_rast: "Rast", opt_ajam: "Ajam", opt_nahawand: "Nahawand", opt_kurd: "Kurd", opt_hijaz: "Hijaz", opt_saba: "Saba", opt_sikah: "Sikah",
                opt_intro_auto: "           🪄            Automatic", opt_intro_long: "           🎻            Long Instrumental", opt_intro_sudden: "           ⚡            Sudden Entry", opt_intro_build: "           📈           \n  Gradual Buildup", opt_intro_perc: "    \n       🥁     \n        Percussive Intro", opt_intro_vocal: "           🎤            Vocal Intro",
                opt_outro_auto: "           🪄            Auto (Maestro's Rec)", opt_outro_fade: "           📉            Smooth Fade-out", opt_outro_stop: "           🛑            Abrupt Stop", opt_outro_epic: "           🏛️         \n    Epic Grand Finale", opt_outro_soft: " \n        \n  🍃            Soft Landing", opt_outro_crescendo: "           📈            Building Intensity", opt_outro_vocal: "           🎤            Vocal Ad-libs",
                opt_outro_solo: "           🎻            Instrumental Solo",
                opt_mp3_128: "Standard Quality (128 kbps)", opt_mp3_256: "High Quality (256 kbps)", opt_mp3_320: "Studio Quality (320 kbps)",
                footer_dev: "Concept & Programming: Hussein Elmalek", acc_security: "Account Security", acc_password: "Password:", acc_picture: "Profile Picture:", acc_logout: "Logout",
                app_shortcuts: "Keyboard Shortcuts", app_shortcuts_toggle: "Enable Shortcuts",
                notif_enable: "Enable Notifications", notif_sounds: "Sound Alerts", notif_types: "Notification Types", notif_all: "All", notif_important: "Important Only", notif_dnd: "Do Not Disturb",
                priv_2fa: "Two-Factor Authentication", priv_setup: "Setup", priv_applock: "App Lock", priv_permissions: "Permissions", priv_manage: "Manage", priv_devices: "Connected Devices", priv_view: "View (1)",
                data_cache: "Clear Cache", data_clear: "Clear", data_optimize: "Optimize Data Usage", data_backup: "Automatic Backup", data_files: "File Management", data_manage: "Manage",
                set_accessibility: "           ♿            Accessibility", accs_zoom: "Text Zoom", accs_contrast: "High Contrast Mode", accs_reader: "Screen Reader Support", accs_keys: "Customize",
                limit_reached: "Usage limit reached.",
                ob_welcome: "Welcome to Music Factory", ob_welcome_desc: "Your ultimate AI music prompt engineering tool.",
                ob_lyrics: "1. Lyrics Input", ob_lyrics_desc: "Enter your lyrics or drag & drop a file to auto-distribute them.",
                ob_melody: "2. Studio", ob_melody_desc: "Select your rhythm, mood, and style from the Studio, or use the Prompt Library.",
                ob_generate: "3. Generate Prompt", ob_generate_desc: "Hit generate to get your ready-to-use prompts for Suno AI!",
                ob_skip: "Skip", ob_back: "Back", ob_next: "Next", ob_finish: "Finish",
                sec_prompt_lib: "           📚            Ready-Made Melody Generators for Non-Specialists", opt_lib_custom: "Custom Design...", opt_lib_pop: "Pop", opt_lib_cinematic: "Cinematic", opt_lib_epic: "Epic Trailer", opt_lib_ambient: "Ambient", opt_lib_lofi: "Lofi", opt_lib_arabic_pop: "Arabic Pop", opt_lib_emotional: "Emotional Piano", opt_lib_orchestral: "Orchestral Score",
                cat_scene: "Scene Type:", cat_dialogue: "Dialogue Presense:", cat_density: "Music Density:",
                nav_home: "Home", nav_studio: "Studio", nav_production: "Production", nav_community: "Community", nav_my_project: "My Project"
            }
        };
        let currentLang = 'en';
        return {
            init: () => {
                let savedLang = StorageManager.load('mf_lang');
                if (!savedLang) {
                    const navLang = navigator.language || navigator.userLanguage || '';
                    savedLang = navLang.toLowerCase().startsWith('ar') ? 'ar' : 'en';
                }
                currentLang = savedLang;
                TranslationEngine.apply(currentLang);
            },
            apply: (lang) => {
                currentLang = lang;
                StorageManager.save('mf_lang', lang);
                document.documentElement.lang = lang;
                document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';
                const dict = dicts[lang];
                document.querySelectorAll('[data-i18n]').forEach(el => {
                    const key = el.getAttribute('data-i18n');
                    if (dict[key]) el.textContent = dict[key];
                });
                document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                    const key = el.getAttribute('data-i18n-placeholder');
                    if (dict[key]) el.setAttribute('placeholder', SecurityManager.escapeHTML(dict[key]));
                });
                document.querySelectorAll('[data-i18n-label]').forEach(el => {
                    const key = el.getAttribute('data-i18n-label');
                    if (dict[key]) el.label = dict[key];
                });
                document.querySelectorAll('[data-i18n-title]').forEach(el => {
                    const key = el.getAttribute('data-i18n-title');
                    if (dict[key]) el.setAttribute('title', dict[key]);
                });
                const dom = window.UIController.getDOM();
                if (dom.langSelect) dom.langSelect.value = lang;
                if (dom.dynGenText) {
                    const isInst = dom.radioInst && dom.radioInst.checked;
                    const dynKey = isInst ? 'btn_dyn_gen_melody' : 'btn_dyn_gen_song';
                    if (dict[dynKey]) dom.dynGenText.textContent = dict[dynKey];
                }
                if (typeof OrchestrationManager !== 'undefined') OrchestrationManager.reRender();
                if (typeof UIController !== 'undefined') updateMaqamGuide();
            },
            get: (key) => dicts[currentLang][key] || key,
            getCurrentLang: () => currentLang,
            translateDirect: (arText, enText) => {
                return currentLang === 'ar' ? arText : enText;
            }
        };
    })();

    const NotificationManager = (() => {
        let toastTimeout;
        return {
            showToast: (msgKey) => {
                const dom = window.UIController.getDOM();
                if (!dom.toast) return;
                const msg = TranslationEngine.get(msgKey);
                dom.toast.textContent = msg;
                dom.toast.classList.add('show');
                dom.toast.style.animation = 'none';
                void dom.toast.offsetHeight;
                dom.toast.style.animation = 'fadein 0.5s, pulse 1s 1, fadeout 0.5s 2.5s';
                clearTimeout(toastTimeout);
                toastTimeout = setTimeout(() => {
                    dom.toast.classList.remove('show');
                    dom.toast.style.animation = '';
                }, 3000);
            }
        };
    })();

    const SettingsManager = (() => {
        let currentThemeMode = 'dark';
        let userCredits = 10;
        const applyTheme = (mode) => {
            currentThemeMode = mode;
            let isLight = false;
            if (mode === 'auto') {
                const hour = new Date().getHours();
                isLight = hour >= 6 && hour < 18;
            } else {
                isLight = mode === 'light';
            }
            document.body.classList.toggle("light-mode", isLight);
            const dom = UIController.getDOM();
            if (dom.themeBtn) {
                let icon = "           🌙           ";
                let tooltipKey = "theme_dark";
                if (mode === 'light') {
                    icon = "           ☀️           ";
                    tooltipKey = "theme_light";
                }
                else if (mode === 'auto') {
                    icon = "           ⏱️           ";
                    tooltipKey = "theme_auto";
                }
                dom.themeBtn.querySelector("span").textContent = icon;
                dom.themeBtn.setAttribute("data-i18n-title", tooltipKey);
                dom.themeBtn.setAttribute("title", TranslationEngine.get(tooltipKey) || mode);
            }
        };
        const changePrimaryColor = (color) => {
            document.documentElement.style.setProperty('--primary-color', color);
            document.documentElement.style.setProperty('--neon-blue', color);
            StorageManager.save('mf_primary_color', color);
        };
        const changeFontSize = (size) => {
            document.documentElement.style.setProperty('--app-font-size', size + 'px');
            StorageManager.save('mf_font_size', size);
        };
        const toggleFullscreen = () => {
            const dom = UIController.getDOM();
            let isFs = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
            if (!isFs) {
                if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
                else if (document.documentElement.webkitRequestFullscreen) document.documentElement.webkitRequestFullscreen();
                else if (document.documentElement.msRequestFullscreen) document.documentElement.msRequestFullscreen();
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
                else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
                else if (document.msExitFullscreen) document.msExitFullscreen();
            }
        };
        return {
            init: () => {
                const dom = UIController.getDOM();
                let savedTheme = StorageManager.load("themeMode");
                if (!savedTheme) {
                    let oldTheme = StorageManager.load("mf_theme");
                    savedTheme = oldTheme ? oldTheme : 'dark';
                }
                applyTheme(savedTheme);
                if (dom.themeBtn) {
                    dom.themeBtn.addEventListener("click", () => {
                        let nextMode = 'dark';
                        if (currentThemeMode === 'dark') nextMode = 'light';
                        else if (currentThemeMode === 'light') nextMode = 'auto';
                        StorageManager.save("themeMode", nextMode);
                        applyTheme(nextMode);
                    });
                }
                if (StorageManager.load('mf_primary_color')) {
                    changePrimaryColor(StorageManager.load('mf_primary_color'));
                    if (dom.primaryColorPicker) dom.primaryColorPicker.value = StorageManager.load('mf_primary_color');
                }
                if (StorageManager.load('mf_font_size')) {
                    changeFontSize(StorageManager.load('mf_font_size'));
                    if (dom.fontSizeSlider) dom.fontSizeSlider.value = StorageManager.load('mf_font_size');
                } else {
                    changeFontSize(16);
                }
                if (dom.primaryColorPicker) dom.primaryColorPicker.addEventListener('input', (e) => changePrimaryColor(e.target.value));
                if (dom.fontSizeSlider) dom.fontSizeSlider.addEventListener('input', (e) => changeFontSize(e.target.value));
                if (dom.langSelect) dom.langSelect.addEventListener('change', (e) => {
                    TranslationEngine.apply(e.target.value);
                    applyTheme(currentThemeMode);
                    if (typeof PresetLibraryEngine !== 'undefined') PresetLibraryEngine.translateUI();
                });
                let loadedCredits = StorageManager.load('mf_credits');
                userCredits = (loadedCredits !== null && loadedCredits !== undefined) ? parseInt(loadedCredits) : 10;
                if (dom.creditCountSettings) dom.creditCountSettings.innerText = userCredits;
                if (dom.profilePicInput && dom.profilePicPreview) {
                    const savedPic = StorageManager.load('mf_profile_pic');
                    const updateSettingsIcon = (src) => {
                        if (dom.settingsBtn) {
                            dom.settingsBtn.innerHTML = `<img src="${src}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; animation: fadein 0.5s;">`;
                        }
                    };
                    if (savedPic) {
                        dom.profilePicPreview.src = savedPic;
                        dom.profilePicPreview.style.display = 'block';
                        updateSettingsIcon(savedPic);
                    }
                    dom.profilePicInput.addEventListener('change', function (e) {
                        if (e.target.files && e.target.files[0]) {
                            const reader = new FileReader();
                            reader.onload = function (event) {
                                dom.profilePicPreview.src = event.target.result;
                                dom.profilePicPreview.style.display = 'block';
                                StorageManager.save('mf_profile_pic', event.target.result);
                                updateSettingsIcon(event.target.result);
                            };
                            reader.readAsDataURL(e.target.files[0]);
                            
                        }
                    });
                }
                if (dom.screenBtn) {
                    dom.screenBtn.addEventListener("click", () => {
                        dom.screenBtn.style.animation = "pressBounce 0.5s ease";
                        setTimeout(() => { dom.screenBtn.style.animation = ""; }, 500);
                        toggleFullscreen();
                    });
                }
                document.addEventListener("fullscreenchange", () => {
                    if (!document.fullscreenElement && dom.screenBtn) {
                        dom.screenBtn.querySelector(".text").textContent = TranslationEngine.get('btn_fullscreen');
                        AnimationManager.startPulse();
                    } else {
                        if (dom.screenBtn) {
                            dom.screenBtn.querySelector(".text").textContent = TranslationEngine.get('btn_fullscreen_exit');
                            dom.screenBtn.style.animation = "";
                        }
                    }
                });
            },
            consumeCredit: () => {
                if (typeof DailyCreditManager !== 'undefined') {
                    return DailyCreditManager.consume();
                }
                if (userCredits <= 0) return false;
                userCredits--;
                StorageManager.save('mf_credits', userCredits);
                const dom = UIController.getDOM();
                if (dom.creditCountSettings) dom.creditCountSettings.innerText = userCredits;
                return true;
            }
        };
    })();

    const AnimationManager = (() => {
        let isPageHidden = false;
        let animationFrameId = null;
        let targetX = 0, targetY = 0;
        let audioCtx = null;
        let lastMove = 0;
        const updateLogoMovement = () => {
            const dom = UIController.getDOM();
            if (!isPageHidden && dom.logoBox) {
                const appTitleContainer = dom.logoBox.querySelector('.app-title-container');
                if (appTitleContainer) appTitleContainer.style.transform = `rotateY(${-targetX}deg) rotateX(${targetY}deg)`;
                animationFrameId = requestAnimationFrame(updateLogoMovement);
            }
        };
        return {
            init: () => {
                document.addEventListener("visibilitychange", () => {
                    isPageHidden = document.hidden;
                    document.body.classList.toggle('animations-paused', isPageHidden);
                    if (!isPageHidden) updateLogoMovement();
                });
                document.addEventListener('mousemove', (e) => {
                    const now = Date.now();
                    if (now - lastMove < 30) return;
                    lastMove = now;
                    if (isPageHidden || window.scrollY > 300) return;
                    targetX = (window.innerWidth / 2 - e.pageX) / 35;
                    targetY = (window.innerHeight / 2 - e.pageY) / 35;
                }, { passive: true });
                document.addEventListener('mouseleave', () => {
                    targetX = 0; targetY = 0;
                });
                updateLogoMovement();
                const dom = UIController.getDOM();
                if (dom.screenBtn) {
                    let animating = false;
                    document.addEventListener("mousemove", (e) => {
                        if (document.fullscreenElement || animating || isPageHidden) return;
                        animating = true;
                        requestAnimationFrame(() => {
                            const rect = dom.screenBtn.getBoundingClientRect();
                            const centerX = rect.left + rect.width / 2;
                            const centerY = rect.top + rect.height / 2;
                            const deltaX = (e.clientX - centerX) / 15;
                            const deltaY = (e.clientY - centerY) / 15;
                            dom.screenBtn.style.transform = `rotateX(${-deltaY}deg) rotateY(${deltaX}deg)`;
                            dom.screenBtn.style.boxShadow = `${6 + deltaY}px ${6 + deltaX}px 20px rgba(56,142,60,0.7), 0 12px 24px rgba(0,0,0,0.15)`;
                            const hue = Math.min(Math.max((e.clientX / window.innerWidth) * 360, 0), 360);
                            dom.screenBtn.style.background = `linear-gradient(145deg, hsl(${hue},80%,45%), hsl(${(hue + 30) % 360},70%,35%))`;
                            const glow = document.getElementById("glow");
                            if (glow) {
                                glow.style.transform = `translate(${deltaX * 2}px, ${deltaY * 2}px)`;
                                glow.style.background = `radial-gradient(circle, hsl(${hue},100%,80%) 0%, rgba(255,255,255,0) 70%)`;
                            }
                            const relX = ((e.clientX - rect.left) / rect.width) * 100;
                            const relY = ((e.clientY - rect.top) / rect.height) * 100;
                            dom.screenBtn.style.backgroundImage = `linear-gradient(145deg, hsl(${hue},80%,45%), hsl(${(hue + 30) % 360},70%,35%)), radial-gradient(circle at ${relX}% ${relY}%, rgba(255,255,255,0.35), transparent 60%)`;
                            dom.screenBtn.style.backgroundBlendMode = "overlay";
                            animating = false;
                        });
                    }, { passive: true });
                }
            },
            startPulse: () => {
                const dom = UIController.getDOM();
                if (!document.fullscreenElement && dom.screenBtn) dom.screenBtn.style.animation = "pulse 2s infinite";
            },
            playClickSound: () => {
                try {
                    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    if (audioCtx.state === 'suspended') audioCtx.resume();
                    const osc = audioCtx.createOscillator();
                    const gainNode = audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
                    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                    osc.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    osc.start();
                    osc.stop(audioCtx.currentTime + 0.1);
                } catch (e) { }
            },
            showLoader: (state) => {
                const loader = document.getElementById('loadingOverlay');
                if (loader) state ? loader.classList.add('active') : loader.classList.remove('active');
            }
        };
    })();

    const OnboardingManager = (() => {
        let currentStep = 0;
        const totalSteps = 4;
        const updateUI = () => {
            const dom = UIController.getDOM();
            if (dom.obSteps) {
                dom.obSteps.forEach((el, idx) => { el.style.display = idx === currentStep ? 'block' : 'none'; });
            }
            if (dom['ob-back']) dom['ob-back'].style.display = currentStep > 0 ? 'block' : 'none';
            if (dom['ob-next']) dom['ob-next'].style.display = currentStep < totalSteps - 1 ? 'block' : 'none';
            if (dom['ob-finish']) dom['ob-finish'].style.display = currentStep === totalSteps - 1 ? 'block' : 'none';
        };
        const closeOB = () => {
            StorageManager.save('musicFactory_onboardingCompleted', true);
            const dom = UIController.getDOM();
            if (dom.onboardingOverlay) dom.onboardingOverlay.classList.remove('active');
        };
        return {
            init: () => {
                if (!StorageManager.load('musicFactory_onboardingCompleted')) {
                    const dom = UIController.getDOM();
                    if (dom.onboardingOverlay) dom.onboardingOverlay.classList.add('active');
                    if (dom['ob-next']) dom['ob-next'].addEventListener('click', () => { if (currentStep < totalSteps - 1) currentStep++; updateUI(); });
                    if (dom['ob-back']) dom['ob-back'].addEventListener('click', () => { if (currentStep > 0) currentStep--; updateUI(); });
                    if (dom['ob-skip']) dom['ob-skip'].addEventListener('click', closeOB);
                    if (dom['ob-finish']) dom['ob-finish'].addEventListener('click', closeOB);
                }
            }
        };
    })();

    const DurationManager = (() => {
        let durInterval;
        const addHoldEvents = (btnId, delta) => {
            const btn = document.getElementById(btnId);
            if (!btn) return;
            const start = (e) => {
                e.preventDefault();
                DurationManager.update(parseInt(UIController.getDOM().p_duration.value) + delta);
                if (FormManager.autoSave) FormManager.autoSave();
                durInterval = setInterval(() => {
                    DurationManager.update(parseInt(UIController.getDOM().p_duration.value) + delta);
                    if (FormManager.autoSave) FormManager.autoSave();
                }, 150);
            };
            const stop = () => clearInterval(durInterval);
            btn.addEventListener('mousedown', start);
            btn.addEventListener('mouseup', stop);
            btn.addEventListener('mouseleave', stop);
            btn.addEventListener('touchstart', start, { passive: false });
            btn.addEventListener('touchend', stop);
        };
        return {
            update: (newVal) => {
                const dom = UIController.getDOM();
                const durInput = dom.p_duration;
                if (!durInput) return;
                const type = dom.p_track_type ? dom.p_track_type.value : 'full';
                let max = 600, min = 5;
                if (type === 'cue') max = 60;
                if (newVal === undefined) newVal = parseInt(durInput.value);
                if (newVal > max) newVal = max;
                if (newVal < min) newVal = min;
                durInput.value = newVal;
                const durLabel = document.getElementById('dur_label');
                const isAr = document.documentElement.lang === 'ar';
                let label = "";
                if (newVal < 60) label = newVal + (isAr ? " ثانية" : " Seconds");
                else if (newVal === 60) label = isAr ? "دقيقة واحدة" : "1 Minute";
                else if (newVal === 90) label = isAr ? "دقيقة ونص" : "1.5 Minutes";
                else if (newVal === 120) label = isAr ? "دقيقتين" : "2 Minutes";
                else if (newVal === 150) label = isAr ? "دقيقتين ونص" : "2.5 Minutes";
                else if (newVal === 180) label = isAr ? "3 دقائق" : "3 Minutes";
                else label = Math.floor(newVal / 60) + (isAr ? "د " : "m ") + (newVal % 60) + (isAr ? "ث" : "s");
                if (durLabel) durLabel.innerText = label;
            },
            init: () => {
                const dom = UIController.getDOM();
                addHoldEvents('btn_dur_dec', -5);
                addHoldEvents('btn_dur_inc', 5);
                if (dom.p_track_type) dom.p_track_type.addEventListener('change', () => {
                    DurationManager.update();
                    if (FormManager.autoSave) FormManager.autoSave();
                });
                DurationManager.update();
            }
        };
    })();

    const OrchestrationManager = (() => {
        const categories = {
            strings: { ar: 'وتريات', en: 'Strings', inst: ['Violins', 'Cello', 'Double Bass', 'Oud', 'Qanun', 'Guitar'] },
            woodwinds: { ar: 'نفخ خشبية', en: 'Woodwinds', inst: ['Flute', 'Clarinet', 'Oboe', 'Ney', 'Kawala'] },
            brass: { ar: 'نحاسيات', en: 'Brass', inst: ['Trumpet', 'Trombone', 'French Horn', 'Tuba'] },
            percussion: { ar: 'إيقاعيات', en: 'Percussion', inst: ['Tabla', 'Req', 'Daf', 'Drum Kit', 'Timpani', 'Cymbals', 'Shakers'] },
            plucked: { ar: 'آلات النبر', en: 'Plucked', inst: ['Acoustic Guitar', 'Electric Guitar', 'Harp', 'Mandolin', 'Banjo'] },
            keyboards: { ar: 'كيبورد وبيانو', en: 'Keyboards', inst: ['Grand Piano', 'Electric Piano', 'Accordion', 'Organ', 'Harpsichord', 'Oriental Organ', 'Synthesizer'] }
        };
        let currentSection = 'Intro';
        let selections = { Intro: [], Verse: [], Chorus: [], Bridge: [], Outro: [] };
        const renderCategories = () => {
            const container = document.getElementById('orchCategories');
            if (!container) return;
            container.innerHTML = '';
            const lang = TranslationEngine.getCurrentLang();
            const frag = document.createDocumentFragment();
            Object.keys(categories).forEach(catKey => {
                const cat = categories[catKey];
                const section = document.createElement('div');
                section.style.marginBottom = '15px';
                section.innerHTML = `<div style="font-weight:bold; color:var(--gold); margin-bottom:8px; font-size:14px; border-bottom:1px solid #444; padding-bottom:5px;">${cat[lang]}</div>`;
                const grid = document.createElement('div');
                grid.style.display = 'flex'; grid.style.flexWrap = 'wrap'; grid.style.gap = '8px';
                cat.inst.forEach(instrument => {
                    const label = document.createElement('label');
                    label.style.display = 'flex'; label.style.alignItems = 'center'; label.style.gap = '5px';
                    label.style.background = 'var(--field-night)'; label.style.padding = '6px 12px';
                    label.style.borderRadius = '8px'; label.style.cursor = 'pointer'; label.style.fontSize = '13px';
                    label.style.border = '1px solid #333'; label.style.transition = '0.2s';
                    const cb = document.createElement('input');
                    cb.type = 'checkbox';
                    cb.value = instrument;
                    if (selections[currentSection] && selections[currentSection].includes(instrument)) {
                        cb.checked = true;
                        label.style.borderColor = 'var(--neon-blue)';
                        label.style.boxShadow = '0 0 5px rgba(0, 210, 255, 0.3)';
                    }
                    cb.addEventListener('change', (e) => {
                        if (e.target.checked) {
                            if (!selections[currentSection].includes(instrument)) selections[currentSection].push(instrument);
                            label.style.borderColor = 'var(--neon-blue)';
                            label.style.boxShadow = '0 0 5px rgba(0, 210, 255, 0.3)';
                        } else {
                            selections[currentSection] = selections[currentSection].filter(i => i !== instrument);
                            label.style.borderColor = '#333';
                            label.style.boxShadow = 'none';
                        }
                        updateHiddenInput();
                    });
                    label.appendChild(cb);
                    label.appendChild(document.createTextNode(instrument));
                    grid.appendChild(label);
                });
                section.appendChild(grid);
                frag.appendChild(section);
            });
            container.appendChild(frag);
        };
        const updateHiddenInput = () => {
            const input = document.getElementById('p_instrumentation');
            if (input) {
                let parts = [];
                for (let sec in selections) {
                    if (selections[sec].length > 0) {
                        parts.push(`${sec}: ${selections[sec].join(', ')}`);
                    }
                }
                input.value = parts.join(' | ');
                input.setAttribute('data-json', JSON.stringify(selections));
                input.dispatchEvent(new Event('change'));
                if (FormManager.autoSave) FormManager.autoSave();
            }
        };
        const parseString = (str) => {
            let sel = { Intro: [], Verse: [], Chorus: [], Bridge: [], Outro: [] };
            if (!str) return sel;
            let parts = str.split('|');
            parts.forEach(p => {
                let [sec, insts] = p.split(':');
                if (sec && insts) {
                    sec = sec.trim();
                    if (sel[sec] !== undefined) {
                        sel[sec] = insts.split(',').map(i => i.trim());
                    }
                }
            });
            return sel;
        };
        return {
            init: () => {
                const select = document.getElementById('orchSectionSelect');
                if (select) {
                    ['Intro', 'Verse', 'Chorus', 'Bridge', 'Outro'].forEach(sec => {
                        const opt = document.createElement('option');
                        opt.value = sec; opt.textContent = sec;
                        select.appendChild(opt);
                    });
                    select.addEventListener('change', (e) => {
                        currentSection = e.target.value;
                        renderCategories();
                    });
                }
                const input = document.getElementById('p_instrumentation');
                if (input && input.value) {
                    selections = parseString(input.value);
                }
                renderCategories();
            },
            reRender: () => renderCategories()
        };
    })();

    const updateMaqamGuide = () => {
        const guideEl = document.getElementById('maqamGuideTxt');
        if (!guideEl) return;
        const val = document.getElementById('p_maqam').value;
        const lang = TranslationEngine.getCurrentLang();
        const guides = {
            Bayati: { ar: "حيوي ومناسب للأغاني الشعبية والمقسوم", en: "Lively, good for Shaabi and rhythmic pop" },
            Rast: { ar: "الفخر والأصالة، مناسب للبدايات القوية", en: "Pride and authenticity, majestic" },
            Ajam: { ar: "فرح وانتصار، مناسب للمارشات والمناسبات", en: "Joy and victory, bright major scale" },
            Nahawand: { ar: "رومانسي وعاطفي وهادي", en: "Romantic, emotional, and calm" },
            Kurd: { ar: "مناسب للمشاهد الحزينة والتأملية", en: "Good for sad, reflective, and moody scenes" },
            Hijaz: { ar: "غموض وصحراء، مناسب للروحانيات", en: "Mystery, desert vibe, spiritual" },
            Saba: { ar: "حزن عميق وشجن", en: "Deep sadness and lamenting" },
            Sikah: { ar: "طرب أصيل وقديم", en: "Authentic classical Tarab" },
            Auto: { ar: "الذكاء الاصطناعي هيختار الأنسب", en: "AI will pick the best scale" }
        };
        guideEl.innerText = guides[val] ? guides[val][lang] : "";
    };

    const MusicEngine = (() => {
        const INTRO_LOGIC = {
            "تلقائي (حسب اللحن)": "[Intro]",
            "مقدمة موسيقية طويلة": "[Long Instrumental Intro] [Extended musical build-up]",
            "دخول مفاجئ (بدون مقدمة)": "[Sudden Entry] [No Intro] [Direct Vocals]",
            "بناء تدريجي (تصاعدي)": "[Gradual Buildup Intro] [Crescendo start]",
            "مقدمة إيقاعية (طبلة/درامز)": "[Percussive Intro] [Drum beat start]",
            "مقدمة غنائية (آهات/كورال)": "[Vocal Intro] [Acapella start] [Ad-libs]"
        };
        const OUTRO_LOGIC = {
            "تلقائي (توصية المايسترو)": { tags: "\n\n[Outro]\n[End]" },
            "انسحاب هادئ (تلاشي)": { tags: "\n\n[Outro]\n[Fade out]\n[Long instrumental fade-out]\n[End]" },
            "قفلة حاسمة (سكتة)": { tags: "\n\n[Outro]\n[Sudden stop]\n[Abrupt end]\n[Silence]" },
            "نهاية فخمة (ملحمية)": { tags: "\n\n[Outro]\n[Grand Finale]\n[Epic orchestral finish]\n[Climax]\n[End]" },
            "هدوء تام (نهاية ناعمة)": { tags: "\n\n[Outro]\n[Slow fade]\n[Soft landing]\n[Peaceful silence]\n[End]" },
            "زيادة الحماس (تصاعد)": { tags: "\n\n[Outro]\n[Crescendo]\n[Building up intensity]\n[Final peak]\n[End]" },
            "ارتجال غنائي (آهات)": { tags: "\n\n[Outro]\n[Vocal improvisation]\n[Soulful ad-libs]\n[Emotional vocal fade-out]" },
            "عزف منفرد (صولو)": { tags: "\n\n[Outro]\n[Solo instrumental focus]\n[Authentic oriental solo]\n[Instrumental coda]\n[End]" }
        };
        const MAESTRO = {
            rhythms: { maqsum: "Modern Arabic Maqsum rhythm, Egyptian-Arabic-Vocals, Cairo-Accent, Authentic-Darbuka-Percussion, 4/4 upbeat", saidi: "Energetic Upper Egyptian Saidi beat, Egyptian-Arabic-Vocals, Cairo-Accent, Mizmar and heavy Bass Tabla", fallahi: "Fast Modern Egyptian Pop, Fellahi rhythm, Egyptian-Arabic-Vocals, rapid succession of sharp Tek", baladi: "Traditional Egyptian Baladi rhythm, Egyptian-Arabic-Vocals, double Doum accents, warm Accordion", ayoub: "Fast Egyptian Ayoub rhythm, Egyptian-Arabic-Vocals, Zar percussion, frame drums", mahraganat: "Modern Egyptian Mahraganat style, Egyptian Street Slang, Autotuned Shaabi vocals, distorted synth bass", trap: "Modern Egyptian Trap style, Egyptian Street Slang, 808 bass, dark synths, rap delivery", fox: "Modern Arabic Pop, Fox rhythm style, Egyptian-Arabic-Vocals, steady 2/4 percussion", malfuf: "Modern Arabic Pop, fast Malfuf rhythm, Egyptian-Arabic-Vocals, syncopated 2/4 beat", None: "Free timing, Ambient flow, No explicit rhythm" },
            oman: { razha: "Modern Omani Razha celebration, Omani-Arabic-Dialect, Dhofari-Tribal-Phrasing, Rahmani-Kaser-Percussion", bara: "Traditional Omani Dhofari Bar'a music, Omani-Arabic-Dialect, synchronized Rahmani and Kaser" },
            gulf: { pop_khaliji: "Modern Khaleeji Pop, Bandari rhythm, Khaleeji-Arabic-Accent, Gulf-Dialect, Merwas-Clapping-Beat", samri: "Classic Khaleeji Samri rhythm, Khaleeji-Arabic-Accent, Gulf-Dialect, heavy frame drums" },
            shami: { dabke: "Levantine Dabke beat, Levantine-Arabic-Dialect, Shami-accent, Mijwiz and Tabl, stomp-heavy" },
            fusha: { military_march: "Grand Arabic Military March, Modern-Standard-Arabic, Clear-Diction, Majestic-Orchestral-Vocals, snare drum rolls", school_march: "Grand Heroic March, Modern-Standard-Arabic, Clear-Diction, powerful choir, sharp trumpets", wahda_kabira: "Grand Arabic Masmudi Kabir rhythm, Wahda Kabira beat, Modern-Standard-Arabic, Clear-Diction, symphonic", waltz: "Modern Arabic Waltz, 3/4 rhythmic time, Modern-Standard-Arabic, elegant ballroom swing" },
            maqams: { Bayati: "Bayati maqam, microtonal oriental warmth, ethnic woodwinds, 1/4 tone inflections", Rast: "Rast maqam, authoritative Arabic scale, majestic oriental intervals, 1/4 tone resonant", Ajam: "Ajam maqam, bright Major scale energy, Western-Arabic bridge, triumphant", Nahawand: "Nahawand maqam, natural minor cinematic, romantic Arabic scale, smooth flow", Kurd: "Kurd maqam, Phrygian minor vibe, emotional oriental softness, modern moody", Hijaz: "Hijaz maqam, harmonic minor exotic, spiritual oriental tension, mystical desert vibe", Saba: "Saba maqam, extreme microtonal tension, sad lamenting scale, ritualistic Arabic", Sikah: "Sikah maqam, quarter-tone tonic center, authentic Tarab scale, classical antique" },
            feelings: { joyful: "Major key, Bright tonality, energetic atmosphere", danceable: "Upbeat groove, driving rhythm, festive vibe", festive: "Celebratory mood, bright instruments", uplifting: "Motivational progression, inspiring melodies", romantic: "Soft emotional delivery, intimate acoustic phrasing", sad: "Minor key, Emotional depth, sorrowful strings", tragic: "Dark cinematic tension, heavy emotional weight", nostalgic: "Vintage warmth, sentimental melodies", proud: "Epic orchestration, Intense delivery, grand scale", powerful: "Aggressive attack, loud brass/synth stabs", epic: "Massive soundscape, cinematic hits, triumphant" }
        };
        const getRhythmTag = (rKey) => {
            if (MAESTRO.rhythms[rKey]) return MAESTRO.rhythms[rKey];
            if (MAESTRO.oman[rKey]) return MAESTRO.oman[rKey];
            if (MAESTRO.gulf[rKey]) return MAESTRO.gulf[rKey];
            if (MAESTRO.shami[rKey]) return MAESTRO.shami[rKey];
            if (MAESTRO.fusha[rKey]) return MAESTRO.fusha[rKey];
            return "";
        };
        return {
            distributeLyrics: (text) => {
                const dom = UIController.getDOM();
                let lines = text.split('\n');
                let currentSection = '';
                if (dom.chorus) dom.chorus.value = '';
                if (dom.v1) dom.v1.value = '';
                if (dom.v2) dom.v2.value = '';
                let hasKeywords = text.includes("المذهب") || text.includes("الكوبليه") || text.includes("Chorus") || text.includes("Verse");
                if (hasKeywords) {
                    lines.forEach(line => {
                        let trimmedLine = line.trim();
                        if (trimmedLine.includes("المذهب") || trimmedLine.includes("Chorus")) currentSection = 'chorus';
                        else if (trimmedLine.includes("الكوبليه الأول") || trimmedLine.includes("Verse 1")) currentSection = 'v1';
                        else if (trimmedLine.includes("الكوبليه الثاني") || trimmedLine.includes("Verse 2")) currentSection = 'v2';
                        else if (currentSection && trimmedLine !== '') {
                            let targetElement = dom[currentSection];
                            if (targetElement) targetElement.value += trimmedLine + '\n';
                        }
                    });
                } else {
                    let validLines = lines.filter(l => l.trim().length > 0);
                    let chunk = Math.ceil(validLines.length / 3);
                    if (dom.chorus) dom.chorus.value = validLines.slice(0, chunk).join('\n');
                    if (dom.v1) dom.v1.value = validLines.slice(chunk, chunk * 2).join('\n');
                    if (dom.v2) dom.v2.value = validLines.slice(chunk * 2).join('\n');
                }

                ['chorus', 'v1', 'v2'].forEach(id => {
                    if (dom[id]) dom[id].dispatchEvent(new Event('input'));
                });
            },
            generateUltimatePrompt: () => {
                const dom = UIController.getDOM();
                const isInst = dom.radioInst && dom.radioInst.checked;
                const r_val = SecurityManager.escapeHTML(dom.p_rhythm.value);
                const f_val = SecurityManager.escapeHTML(dom.p_feeling.value);
                const v_val = isInst ? "Instrumental Solo, No Vocals" : SecurityManager.escapeHTML(dom.p_vocals.value);
                let t_val = dom.p_tempo.value;
                if (t_val === "Manual") t_val = SecurityManager.escapeHTML(dom.manualTempo.value) + " BPM";
                else if (t_val === "Auto") t_val = "";
                const m_val = SecurityManager.escapeHTML(dom.p_maqam.value);
                const rMode = dom.p_rhythmic_mode.value;
                const trackType = dom.p_track_type.value;
                const duration = dom.p_duration.value;
                const inst = SecurityManager.escapeHTML(dom.p_instrumentation.value);
                let styleArr = [];
                let typeStr = "";
                if (trackType === 'cue') typeStr = "Short Cinematic Cue";
                else if (trackType === 'loop') typeStr = "Seamless Loop";
                else typeStr = "Full Cinematic Composition";
                styleArr.push(typeStr);
                if (rMode === 'Ambient' || r_val === 'None') {
                    styleArr.push("Ambient, Beatless, No Percussion, Atmospheric, Free Timing");
                } else if (rMode === 'Hybrid') {
                    styleArr.push(getRhythmTag(r_val));
                    styleArr.push("Hybrid Pulse, Subtle Undercurrent, Textured Rhythm");
                } else {
                    styleArr.push(getRhythmTag(r_val));
                }
                if (m_val !== "Auto") styleArr.push(MAESTRO.maqams[m_val]);
                styleArr.push(MAESTRO.feelings[f_val]);
                styleArr.push(v_val);
                if (t_val) styleArr.push(t_val);
                if (inst) styleArr.push("Orchestration & Sections: " + inst);
                if (isInst && document.getElementById('cineScene')) {
                    if (document.getElementById('cineScene').value) styleArr.push(SecurityManager.escapeHTML(document.getElementById('cineScene').value));
                    if (document.getElementById('cineDialogue').value === "Yes") styleArr.push("Background Score, Under Dialogue, Lower Intensity");
                    if (document.getElementById('cineDensity').value && document.getElementById('cineDensity').value !== "Auto") styleArr.push(SecurityManager.escapeHTML(document.getElementById('cineDensity').value));
                }
                styleArr.push("High-Fidelity Studio Production, Studio Mastered");
                styleArr.push(`Duration Target: ${duration} seconds`);
                const finalStyle = styleArr.filter(x => x !== "").join(", ");
                let finalLyrics = "";
                const introSelection = dom.introDropdown ? dom.introDropdown.value : "تلقائي (حسب اللحن)";
                let introTags = "";
                if (introSelection === "تلقائي (حسب اللحن)" || introSelection === "Automatic") {
                    const m = dom.p_feeling.value;
                    if (m === "epic" || m === "powerful") introTags = "[Epic Intro] [Orchestral swell]";
                    else if (m === "danceable" || m === "festive") introTags = "[Upbeat Intro] [Catchy rhythm start]";
                    else if (m === "sad" || m === "tragic") introTags = "[Melancholic Intro] [Slow instrumental start]";
                    else introTags = "[Intro] [Instrumental build-up]";
                } else {
                    introTags = INTRO_LOGIC[introSelection] || "[Intro] [Instrumental build-up]";
                }
                if (!isInst) {
                    const chorus = SecurityManager.escapeHTML(dom.chorus.value.trim());
                    const v1 = SecurityManager.escapeHTML(dom.v1.value.trim());
                    const v2 = SecurityManager.escapeHTML(dom.v2.value.trim());
                    const outroText = SecurityManager.escapeHTML(dom.outro.value.trim());
                    const outroSelection = dom.outroDropdown.value;
                    finalLyrics += `${introTags}\n\n`;
                    if (v1) finalLyrics += `[Verse 1]\n${v1}\n\n`;
                    if (chorus) finalLyrics += `[Chorus] [Catchy hook]\n${chorus}\n\n`;
                    if (v1 && v2) finalLyrics += `[Interlude] [Instrumental Solo]\n\n`;
                    if (v2) finalLyrics += `[Verse 2]\n${v2}\n\n`;
                    if (chorus && v2) finalLyrics += `[Chorus] [Catchy hook]\n${chorus}\n\n`;
                    const selectedData = OUTRO_LOGIC[outroSelection] || OUTRO_LOGIC["تلقائي (توصية المايسترو)"];
                    finalLyrics = (finalLyrics + (outroText ? `\n${outroText}` : "")).trim() + selectedData.tags;
                } else {
                    finalLyrics = `${introTags}\n\n[Main Theme / Melody]\n\n[Bridge]\n\n[Climax]\n\n[Outro] [Fade Out]`;
                }
                const totalLength = finalLyrics.length + finalStyle.length;
                if (dom.out_style) dom.out_style.textContent = finalStyle;
                if (dom.out_lyrics) dom.out_lyrics.textContent = finalLyrics;
                const fullPrompt = `--- STYLE ---\n${finalStyle}\n\n--- LYRICS ---\n${finalLyrics}`;
                if (dom.out_full) dom.out_full.textContent = fullPrompt;
                if (dom.outCountL) dom.outCountL.textContent = `${totalLength} / 3000`;
                NotificationManager.showToast('toast_copied');
            },
            triggerImmersiveMood: () => {
                const dom = UIController.getDOM();
                const mood = dom.p_feeling.value;
                const root = document.documentElement;
                if (mood === 'sad' || mood === 'tragic') {
                    root.style.setProperty('--day-start', '#5a6b7c');
                    root.style.setProperty('--night-start', '#080c11');
                } else if (mood === 'joyful' || mood === 'danceable') {
                    root.style.setProperty('--day-start', '#ffecd2');
                    root.style.setProperty('--night-start', '#1a0b1c');
                } else {
                    root.style.setProperty('--day-start', '#87ceeb');
                    root.style.setProperty('--night-start', '#0f2027');
                }
            }
        };
    })();

    const FormManager = (() => {
        let autoSaveTimeout;
        return {
            autoSave: () => {
                clearTimeout(autoSaveTimeout);
                autoSaveTimeout = setTimeout(() => {
                    const dom = UIController.getDOM();
                    const data = {
                        chorus: dom.chorus ? dom.chorus.value : '',
                        v1: dom.v1 ? dom.v1.value : '',
                        v2: dom.v2 ? dom.v2.value : '',
                        outro: dom.outro ? dom.outro.value : '',
                        outroSelect: dom.outroDropdown ? dom.outroDropdown.value : '',
                        introSelect: dom.introDropdown ? dom.introDropdown.value : '',
                        rhythmicMode: dom.p_rhythmic_mode ? dom.p_rhythmic_mode.value : '',
                        rhythm: dom.p_rhythm ? dom.p_rhythm.value : '',
                        feeling: dom.p_feeling ? dom.p_feeling.value : '',
                        vocals: dom.p_vocals ? dom.p_vocals.value : '',
                        trackType: dom.p_track_type ? dom.p_track_type.value : '',
                        duration: dom.p_duration ? dom.p_duration.value : '',
                        instrumentation: dom.p_instrumentation ? dom.p_instrumentation.value : '',
                        tempo: dom.p_tempo ? dom.p_tempo.value : '',
                        manualTempo: dom.manualTempo ? dom.manualTempo.value : '',
                        maqam: dom.p_maqam ? dom.p_maqam.value : ''
                    };
                    StorageManager.save('mf_savedData', data);
                }, 500);
            },
            loadSavedData: () => {
                const saved = StorageManager.load('mf_savedData');
                if (saved) {
                    const dom = UIController.getDOM();
                    if (dom.chorus) dom.chorus.value = saved.chorus || '';
                    if (dom.v1) dom.v1.value = saved.v1 || '';
                    if (dom.v2) dom.v2.value = saved.v2 || '';
                    if (dom.outro) dom.outro.value = saved.outro || '';
                    if (dom.outroDropdown && saved.outroSelect) dom.outroDropdown.value = saved.outroSelect;
                    if (dom.introDropdown && saved.introSelect) dom.introDropdown.value = saved.introSelect;
                    if (dom.p_rhythmic_mode) { dom.p_rhythmic_mode.value = saved.rhythmicMode || 'Rhythmic'; dom.p_rhythmic_mode.dispatchEvent(new Event('change')); }
                    if (dom.p_rhythm) dom.p_rhythm.value = saved.rhythm || 'Auto';
                    if (dom.p_feeling) dom.p_feeling.value = saved.feeling || 'Auto';
                    if (dom.p_vocals) dom.p_vocals.value = saved.vocals || 'Auto';
                    if (dom.p_track_type) dom.p_track_type.value = saved.trackType || 'full';
                    if (dom.p_duration && saved.duration) dom.p_duration.value = saved.duration;
                    if (dom.p_instrumentation) {
                        dom.p_instrumentation.value = saved.instrumentation || '';
                        if (typeof OrchestrationManager !== 'undefined') OrchestrationManager.init();
                    }
                    if (dom.p_tempo) {
                        dom.p_tempo.value = saved.tempo || 'Auto';
                        if (dom.manualTempo) dom.manualTempo.style.display = (dom.p_tempo.value === 'Manual') ? 'block' : 'none';
                    }
                    if (dom.manualTempo) dom.manualTempo.value = saved.manualTempo || '';
                    if (dom.p_maqam) {
                        dom.p_maqam.value = saved.maqam || 'Auto';
                        updateMaqamGuide();
                    }
                    if (dom.chorus) dom.chorus.dispatchEvent(new Event('input'));
                    if (dom.v1) dom.v1.dispatchEvent(new Event('input'));
                    if (dom.v2) dom.v2.dispatchEvent(new Event('input'));
                    if (dom.outro) dom.outro.dispatchEvent(new Event('input'));
                    MusicEngine.triggerImmersiveMood();
                    if (typeof DurationManager !== 'undefined') DurationManager.update();
                    if (typeof UIEnhancementManager !== 'undefined') UIEnhancementManager.syncDropdowns();
                }
            },
            clearFields: () => {
                const dom = UIController.getDOM();
                const currentData = StorageManager.load('mf_savedData') || {};
                StorageManager.save('mf_backupData', currentData);
                ['chorus', 'v1', 'v2', 'outro', 'manualTempo', 'p_instrumentation'].forEach(id => {
                    if (dom[id]) { dom[id].value = ''; dom[id].dispatchEvent(new Event('input')); }
                });
                if (dom.p_rhythmic_mode) { dom.p_rhythmic_mode.value = 'Rhythmic'; dom.p_rhythmic_mode.dispatchEvent(new Event('change')); }
                if (dom.p_rhythm) dom.p_rhythm.value = 'Auto';
                if (dom.p_feeling) dom.p_feeling.value = 'Auto';
                if (dom.p_vocals) dom.p_vocals.value = 'Auto';
                if (dom.p_track_type) dom.p_track_type.value = 'full';
                if (dom.p_duration) dom.p_duration.value = '60';
                if (dom.p_tempo) { dom.p_tempo.value = 'Auto'; dom.manualTempo.style.display = 'none'; }
                if (dom.p_maqam) dom.p_maqam.value = 'Auto';
                if (dom.introDropdown) dom.introDropdown.value = 'تلقائي (حسب اللحن)';
                if (dom.outroDropdown) dom.outroDropdown.value = 'تلقائي (توصية المايسترو)';
                if (typeof OrchestrationManager !== 'undefined') OrchestrationManager.init();
                updateMaqamGuide();
                FormManager.autoSave();
                if (typeof DurationManager !== 'undefined') DurationManager.update();
                if (typeof UIEnhancementManager !== 'undefined') UIEnhancementManager.syncDropdowns();
                NotificationManager.showToast('toast_cleared');
            },
            restoreFields: () => {
                const backup = StorageManager.load('mf_backupData');
                if (backup && Object.keys(backup).length > 0) {
                    StorageManager.save('mf_savedData', backup);
                    FormManager.loadSavedData();
                    NotificationManager.showToast('toast_restored');
                }
            }
        };
    })();

    const FileExtractionManager = (() => {
        const sanitizeArabicPDF = (text) => {
            return text
                .replace(/ٌ/g, 'ي')
                .replace(/ً/g, 'ي')
                .replace(/ي ي/g, 'ي')
                .replace(/ا ك تر/g, 'اكتر')
                .replace(/\s+/g, ' ')
                .trim();
        };

        return {
            extract: async (file) => {
                const ext = file.name.split('.').pop().toLowerCase();

                if (ext === 'txt' || ext === 'json') {
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.readAsText(file);
                    });
                } else if (ext === 'docx') {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            mammoth.extractRawText({ arrayBuffer: event.target.result })
                                .then(result => resolve(result.value))
                                .catch(reject);
                        };
                        reader.onerror = reject;
                        reader.readAsArrayBuffer(file);
                    });
                } else if (ext === 'pdf') {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                            try {
                                const typedarray = new Uint8Array(event.target.result);
                                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                                let fullText = '';

                                for (let i = 1; i <= pdf.numPages; i++) {
                                    const page = await pdf.getPage(i);
                                    const textContent = await page.getTextContent();

                                    let lastY = -1;
                                    let currentLine = [];

                                    textContent.items.forEach(item => {
                                        if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
                                            let rawLine = currentLine.reverse().join(' ');
                                            fullText += sanitizeArabicPDF(rawLine) + '\n';
                                            currentLine = [];
                                        }
                                        if (item.str.trim() !== '') {
                                            currentLine.push(item.str.trim());
                                        }
                                        lastY = item.transform[5];
                                    });

                                    if (currentLine.length > 0) {
                                        let rawLine = currentLine.reverse().join(' ');
                                        fullText += sanitizeArabicPDF(rawLine) + '\n\n';
                                    }
                                }
                                resolve(fullText);
                            } catch (err) {
                                reject(err);
                            }
                        };
                        reader.onerror = reject;
                        reader.readAsArrayBuffer(file);
                    });
                } else {
                    throw new Error("Unsupported file format");
                }
            }
        };
    })();

    const EventBinder = (() => {
        const dom = UIController.getDOM();
        return {
            init: () => {
                if (dom.settingsBtn) {
                    dom.settingsBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        dom.settingsPage.classList.add('active');
                    });
                }

                if (dom.closeSettingsBtn) {
                    dom.closeSettingsBtn.addEventListener('click', () => {
                        dom.settingsPage.classList.remove('active');
                    });
                }

                document.addEventListener('click', (e) => {
                    if (dom.settingsPage && dom.settingsPage.classList.contains('active')) {
                        const isInsideLayout = e.target.closest('.settings-layout');
                        const isInsideHeader = e.target.closest('.settings-header');
                        const isSettingsBtn = e.target.closest('#settingsBtn');

                        if (!isInsideLayout && !isInsideHeader && !isSettingsBtn) {
                            dom.settingsPage.classList.remove('active');
                        }
                    }
                });

                if (dom.settingsSidebarBtns) {
                    dom.settingsSidebarBtns.forEach(btn => {
                        btn.addEventListener('click', () => {
                            dom.settingsSidebarBtns.forEach(b => b.classList.remove('active'));
                            btn.classList.add('active');
                            const targetId = btn.getAttribute('data-target');
                            dom.settingsSections.forEach(sec => {
                                sec.classList.remove('active');
                                if (sec.id === targetId) sec.classList.add('active');
                            });
                        });
                    });
                }

                document.body.addEventListener('mousedown', (e) => {
                    if (e.target.closest('.screen-btn') && !e.target.closest('#screenBtn')) {
                        const btn = e.target.closest('.screen-btn');
                        const rect = btn.getBoundingClientRect();
                        const circle = document.createElement("span");
                        circle.classList.add("ripple");
                        circle.style.left = (e.clientX - rect.left) + "px";
                        circle.style.top = (e.clientY - rect.top) + "px";
                        btn.appendChild(circle);
                        setTimeout(() => circle.remove(), 600);
                        AnimationManager.playClickSound();
                    }
                });

                if (dom.screenBtn) {
                    dom.screenBtn.addEventListener('mousedown', () => AnimationManager.playClickSound());
                }

                const navMapping = [
                    { navId: 'navHomeLink', tabIndex: 0 },
                    { navId: 'navStudioLink', tabIndex: 1 },
                    { navId: 'navProdLink', tabIndex: 2 }
                ];

                navMapping.forEach(mapping => {
                    const navBtn = document.getElementById(mapping.navId);
                    if (navBtn && dom.tabBtns && dom.tabBtns[mapping.tabIndex]) {
                        navBtn.addEventListener('click', (e) => {
                            e.preventDefault();
                            dom.tabBtns[mapping.tabIndex].click();
                            document.querySelectorAll('.global-navbar .nav-links a').forEach(a => a.classList.remove('active-nav'));
                            navBtn.classList.add('active-nav');

                            // 👇 استرجاع البيانات فوراً عند استخدام النافبار العلوية
                            if (typeof FormManager !== 'undefined' && typeof FormManager.loadSavedData === 'function') {
                                FormManager.loadSavedData();
                            }
                        });
                    }
                });

                if (dom.tabBtns) {
                    dom.tabBtns.forEach((btn, index) => {
                        btn.addEventListener('click', function () {
                            const targetId = this.getAttribute('data-target') || (dom.tabContents[index] ? dom.tabContents[index].id : null);
                            if (!targetId) return;

                            dom.tabContents.forEach(tab => {
                                tab.classList.remove('active');
                                tab.style.display = 'none';
                            });
                            dom.tabBtns.forEach(b => b.classList.remove('active'));

                            const targetTab = document.getElementById(targetId);
                            if (targetTab) {
                                targetTab.classList.add('active');
                                targetTab.style.display = 'block';
                            }
                            this.classList.add('active');

                            const logoBox = document.getElementById('logoBox');
                            const waveBars = document.querySelector('.wave-bars');
                            if (logoBox) logoBox.style.display = (targetId === 'tab-lyrics') ? 'flex' : 'none';
                            if (waveBars) waveBars.style.display = (targetId === 'tab-lyrics') ? 'flex' : 'none';

                            if (dom.navBackBtn) dom.navBackBtn.style.display = index === 0 ? 'none' : 'block';

                            const clearBtn = document.getElementById('clearFieldsBtn');
                            if (clearBtn) clearBtn.style.setProperty('display', (targetId === 'tab-lyrics') ? 'flex' : 'none', 'important');
                            if (typeof FormManager !== 'undefined' && typeof FormManager.loadSavedData === 'function') {
                                FormManager.loadSavedData();
                            }
                            AnimationManager.playClickSound();
                        });
                    });
                }

                if (dom.navBackBtn) {
                    dom.navBackBtn.addEventListener('click', () => {
                        let activeIdx = 0;
                        dom.tabContents.forEach((tab, idx) => {
                            if (tab.classList.contains('active')) activeIdx = idx;
                        });
                        if (activeIdx > 0 && dom.tabBtns[activeIdx - 1]) {
                            dom.tabBtns[activeIdx - 1].click();
                        }
                    });
                }

                if (dom.nextToMelodyBtn && dom.tabBtns[1]) dom.nextToMelodyBtn.addEventListener('click', () => dom.tabBtns[1].click());

                const toggleMode = () => {
                    const isInst = dom.radioInst && dom.radioInst.checked;
                    if (dom.lyricsSection) dom.lyricsSection.style.display = isInst ? 'none' : 'block';
                    if (dom.vocalPillar) {
                        dom.vocalPillar.style.opacity = isInst ? '0.3' : '1';
                        dom.vocalPillar.style.pointerEvents = isInst ? 'none' : 'auto';
                    }
                    if (dom.lyricsOutputWrapper) dom.lyricsOutputWrapper.style.display = isInst ? 'none' : 'block';
                    if (dom.dynGenText) {
                        const key = isInst ? 'btn_dyn_gen_melody' : 'btn_dyn_gen_song';
                        dom.dynGenText.setAttribute('data-i18n', key);
                        dom.dynGenText.innerHTML = TranslationEngine.get(key);
                    }
                    if (typeof PresetLibraryEngine !== 'undefined') {
                        PresetLibraryEngine.toggleMode(isInst);
                    }
                };
                if (dom.radioVocal) dom.radioVocal.addEventListener('change', toggleMode);
                if (dom.radioInst) dom.radioInst.addEventListener('change', toggleMode);
                toggleMode();

                if (dom.dropZone && dom.fileInput) {
                    dom.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dom.dropZone.classList.add('dragover'); });
                    dom.dropZone.addEventListener('dragleave', () => dom.dropZone.classList.remove('dragover'));
                    dom.dropZone.addEventListener('drop', (e) => {
                        e.preventDefault(); dom.dropZone.classList.remove('dragover');
                        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
                    });
                    if (dom.browseFileBtn) dom.browseFileBtn.addEventListener('click', () => dom.fileInput.click());
                    dom.fileInput.addEventListener('change', (e) => {
                        if (e.target.files.length) handleFile(e.target.files[0]);
                    });
                    const handleFile = async (file) => {
                        AnimationManager.showLoader(true);
                        try {
                            const text = await FileExtractionManager.extract(file);
                            MusicEngine.distributeLyrics(text);
                            NotificationManager.showToast('processing');
                        } catch (e) {
                            NotificationManager.showToast('toast_failed');
                        } finally {
                            AnimationManager.showLoader(false);
                            dom.fileInput.value = "";
                        }
                    };
                }

                if (dom.lyricInputs) {
                    dom.lyricInputs.forEach(input => {
                        input.addEventListener('input', Utils.debounce(function () {
                            const limit = parseInt(this.getAttribute('data-limit'));
                            if (limit) {
                                const counterId = this.id + 'Count';
                                const counterEl = dom[counterId];
                                if (counterEl) {
                                    const len = this.value.length;
                                    counterEl.innerText = `${len} / ${limit}`;
                                    counterEl.style.color = len > limit ? 'var(--neon-red)' : '#888';
                                }
                            }
                            FormManager.autoSave();
                        }, 300));
                    });
                }

                if (dom.autoSaveTriggers) {
                    dom.autoSaveTriggers.forEach(el => {
                        el.addEventListener('change', FormManager.autoSave);
                    });
                }

                document.querySelectorAll('.mood-trigger').forEach(el => el.addEventListener('change', MusicEngine.triggerImmersiveMood));
                document.querySelectorAll('.tempo-trigger').forEach(el => el.addEventListener('change', () => {
                    if (dom.manualTempo) dom.manualTempo.style.display = (el.value === 'Manual') ? 'block' : 'none';
                }));

                if (dom.p_rhythmic_mode) {
                    dom.p_rhythmic_mode.addEventListener('change', (e) => {
                        const rhythmSelect = dom.p_rhythm;
                        const wrapper = document.getElementById('p_rhythm_custom_wrapper');
                        if (e.target.value === 'Ambient') {
                            if (rhythmSelect) rhythmSelect.disabled = true;
                            if (wrapper) { wrapper.style.pointerEvents = 'none'; wrapper.style.opacity = '0.5'; }
                        } else {
                            if (rhythmSelect) rhythmSelect.disabled = false;
                            if (wrapper) { wrapper.style.pointerEvents = 'auto'; wrapper.style.opacity = '1'; }
                        }
                    });
                }

                if (dom.p_maqam) dom.p_maqam.addEventListener('change', updateMaqamGuide);

                if (dom.p_feeling) {
                    dom.p_feeling.addEventListener('change', () => {
                        const isAdvanced = dom.advancedOverrideToggle && dom.advancedOverrideToggle.checked;
                        const f = dom.p_feeling.value;
                        const noRhythmMoods = ['sad', 'tragic', 'ambient', 'romantic'];
                        if (!isAdvanced && noRhythmMoods.includes(f)) {
                            if (dom.p_rhythm) { dom.p_rhythm.value = 'None'; dom.p_rhythm.dispatchEvent(new Event('change')); }
                            if (dom.p_rhythmic_mode) { dom.p_rhythmic_mode.value = 'Ambient'; dom.p_rhythmic_mode.dispatchEvent(new Event('change')); }
                        }
                    });
                }

                if (dom.generatePromptBtn) {
                    dom.generatePromptBtn.addEventListener('click', () => {
                        if (typeof DailyCreditManager !== 'undefined' && !DailyCreditManager.consume()) {
                            const isAr = document.documentElement.lang === 'ar' || navigator.language.toLowerCase().startsWith('ar');
                            const msg = isAr ? "لقد استهلكت جميع المحاولات المجانية اليوم. سيتم تجديد الرصيد غداً."
                                : "You have consumed all free attempts today. Credits will renew tomorrow.";
                            if (dom.toast) {
                                dom.toast.innerHTML = msg;
                                dom.toast.classList.add('show');
                                dom.toast.style.animation = 'none';
                                void dom.toast.offsetHeight;
                                dom.toast.style.animation = 'fadein 0.5s, pulse 1s 1, fadeout 0.5s 2.5s';
                                setTimeout(() => dom.toast.classList.remove('show'), 3000);
                            }
                            dom.settingsPage.classList.add('active');
                            if (dom.settingsSidebarBtns && dom.settingsSidebarBtns[0]) dom.settingsSidebarBtns[0].click();
                            return;
                        }
                        AnimationManager.showLoader(true);
                        if (dom.outputContents) dom.outputContents.forEach(el => { el.textContent = ""; el.classList.add('skeleton-box'); });
                        setTimeout(() => {
                            AnimationManager.showLoader(false);
                            if (dom.outputContents) dom.outputContents.forEach(el => el.classList.remove('skeleton-box'));
                            MusicEngine.generateUltimatePrompt();
                            if (dom.tabBtns[2]) dom.tabBtns[2].click();
                        }, 1000);
                    });
                }

                if (dom.dynamicGenerateBtn) {
                    let isGeneratingMusic = false;

                    dom.dynamicGenerateBtn.addEventListener('click', async () => {
                        if (isGeneratingMusic) {
                            if (typeof NotificationManager !== 'undefined') NotificationManager.showToast('processing');
                            return;
                        }

                        const fullPromptText = dom.out_full ? dom.out_full.textContent : "";
                        const lyricsText = dom.out_lyrics ? dom.out_lyrics.textContent : "";
                        const isInst = dom.radioInst && dom.radioInst.checked;
                        const mode = isInst ? 'soundtrack' : 'song';

                        if (!fullPromptText || fullPromptText.includes("...")) {
                            NotificationManager.showToast('toast_failed');
                            return;
                        }

                        if (mode === 'song' && (!lyricsText || lyricsText.trim().length < 20)) {
                            NotificationManager.showToast('toast_failed');
                            return;
                        }

                        isGeneratingMusic = true;
                        dom.dynamicGenerateBtn.style.opacity = '0.5';
                        dom.dynamicGenerateBtn.style.pointerEvents = 'none';
                        dom.dynamicGenerateBtn.innerHTML = '<span>⏳ جاري التوليد...</span>';

                        document.getElementById('resultContainer').style.display = 'block';
                        document.getElementById('statusText').style.display = 'block';
                        document.getElementById('audioPlayer').style.display = 'none';
                        document.getElementById('downloadBtn').style.setProperty('display', 'none', 'important');

                        AnimationManager.showLoader(true);
                        NotificationManager.showToast('processing');

                        // ⚠️ هنا بقى بنحط كود الـ Polling الجديد (مربوط بالباك إند المطور) ⚠️
                        try {
                            // 1. إرسال طلب التوليد الأولي باستخدام NetworkManager المدمج مع الـ Token
                            const initialResult = await NetworkManager.authenticatedFetch('/api/songs/generate', {
                                method: 'POST',
                                body: JSON.stringify({ prompt: fullPromptText }) 
                            });

                            let audioUrl = null;

                            // 2. نظام التتبع (Polling) باستخدام الـ songId
                            if (initialResult.success && initialResult.songId) {
                                const songId = initialResult.songId;
                                document.getElementById('statusText').innerText = "⏳ جاري تلحين المقطوعة (قد يستغرق الأمر دقيقتين)...";
                                document.getElementById('statusText').style.display = 'block';

                                let isComplete = false;
                                while (!isComplete) {
                                    await new Promise(resolve => setTimeout(resolve, 4000)); 
                                    
                                    // جلب حالة الأغنية
                                    const statusData = await NetworkManager.authenticatedFetch(`/api/songs/${songId}`, {
                                        method: 'GET'
                                    });

                                    if (statusData.status === 'completed' && statusData.audioUrl) {
                                        audioUrl = statusData.audioUrl;
                                        isComplete = true;
                                    } else if (statusData.status === 'failed') {
                                        throw new Error(statusData.errorMessage || "فشل التوليد من المصدر.");
                                    }
                                }
                            } else {
                                throw new Error(initialResult.error || "السيرفر لم يرسل ID الأغنية.");
                            }

                            // 3. عرض النتيجة النهائية
                            const audioPlayer = document.getElementById('audioPlayer');
                            const downloadBtn = document.getElementById('downloadBtn');
                            const statusText = document.getElementById('statusText');

                            audioPlayer.src = audioUrl;
                            downloadBtn.href = audioUrl; 

                            audioPlayer.style.display = 'block';
                            document.getElementById('resultContainer').style.display = 'block';
                            downloadBtn.style.setProperty('display', 'inline-block', 'important');
                            if (statusText) statusText.style.display = 'none';

                            NotificationManager.showToast('toast_download_success');

                        } catch (error) {
                            console.error("خطأ في التوليد:", error);
                            
                            if (error.message === "SESSION_EXPIRED" || error.message.includes("401") || error.message.includes("403")) {
                                if (document.getElementById('statusText')) {
                                    document.getElementById('statusText').innerText = "❌ يرجى تسجيل الدخول أولاً للبدء في التوليد.";
                                }
                                const dom = UIController.getDOM();
                                if (dom.settingsPage) dom.settingsPage.classList.add('active');
                            } else {
                                NotificationManager.showToast('toast_failed');
                                if (document.getElementById('statusText')) {
                                    document.getElementById('statusText').innerText = `❌ حدث خطأ: ${error.message}`;
                                }
                            }
                        } finally {
                            // إرجاع حالة الزرار والواجهة لطبيعتها
                            isGeneratingMusic = false;
                            dom.dynamicGenerateBtn.style.opacity = '1';
                            dom.dynamicGenerateBtn.style.pointerEvents = 'auto';

                            const btnTextKey = mode === 'song' ? 'btn_dyn_gen_song' : 'btn_dyn_gen_melody';
                            dom.dynamicGenerateBtn.innerHTML = `<span id="dynGenText" data-i18n="${btnTextKey}">${TranslationEngine.get(btnTextKey)}</span>`;

                            AnimationManager.showLoader(false);
                        }
                    });
                }
                // 🎯 ربط زر "إنشاء مشروع جديد" مع التنبيه الذكي
                if (dom.clearFieldsBtn) {
                    dom.clearFieldsBtn.addEventListener('click', (e) => {
                        // فحص هل يوجد مشروع قيد العمل حالياً؟
                        const currentData = StorageManager.load('mf_savedData') || {};
                        const hasData = (currentData.chorus && currentData.chorus.trim() !== '') || 
                                        (currentData.v1 && currentData.v1.trim() !== '') || 
                                        (currentData.projectName && currentData.projectName.trim() !== '');

                        if (hasData) {
                            ModalManager.confirm(
                                "مشروع جديد 🎵",
                                "هذا الإجراء سيقوم بمسح كافة الكلمات والإعدادات الحالية للبدء من جديد. هل أنت متأكد؟ (تأكد من حفظ مشروعك أولاً)",
                                () => FormManager.clearFields()
                            );
                        } else {
                            // مسح صامت لو الحقول فارغة أساساً
                            FormManager.clearFields();
                        }
                    });
                }
                if (dom.restoreFieldsBtn) dom.restoreFieldsBtn.addEventListener('click', FormManager.restoreFields);
                if (dom.openSunoBtn) dom.openSunoBtn.addEventListener('click', () => window.open('https://suno.com', '_blank'));

                if (dom.downloadMp3Btn) {
    dom.downloadMp3Btn.addEventListener('click', () => {
        // 1. الحصول على الرابط الحقيقي الذي وضعه السيرفر في المشغل
        const currentAudioSrc = document.getElementById('audioPlayer').src;

        // 2. فحص هل يوجد رابط أغنية فعلاً أم لا؟
        if (!currentAudioSrc || currentAudioSrc === "" || currentAudioSrc.includes(Config.API_BASE_URL)) {
            NotificationManager.showToast('toast_failed'); // تنبيه المستخدم بعدم وجود ملف
            return;
        }

        NotificationManager.showToast('processing');
        
        setTimeout(() => {
            const a = document.createElement('a');
            a.href = currentAudioSrc; // استخدام الرابط الحقيقي
            a.download = `Music_Factory_Track_${dom.mp3Quality ? dom.mp3Quality.value : '128'}kbps.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            NotificationManager.showToast('toast_download_success');
        }, 1500);
    });
}

                if (dom.copyBtns) {
                    dom.copyBtns.forEach(btn => {
                        btn.addEventListener('click', async function () {
                            const targetId = this.getAttribute('data-target');
                            const el = document.getElementById(targetId);
                            if (el) {
                                const text = el.textContent;
                                if (text.includes("سيظهر هنا") || text.includes("...")) return;
                                try { await navigator.clipboard.writeText(text); NotificationManager.showToast('toast_copied'); }
                                catch (e) { NotificationManager.showToast('toast_failed'); }
                            }
                        });
                    });
                }

                if (dom.accordions) {
                    dom.accordions.forEach(acc => {
                        acc.addEventListener("click", function () {
                            this.classList.toggle("active");
                            const panel = this.nextElementSibling;
                            if (panel) panel.style.maxHeight = panel.style.maxHeight ? null : panel.scrollHeight + "px";
                        });
                    });
                }

                // --- إظهار وإخفاء كلمة المرور ---
                const togglePasswordBtn = document.getElementById('togglePasswordBtn');
                const accPasswordInput = document.getElementById('accPasswordInput');
                if (togglePasswordBtn && accPasswordInput) {
                    togglePasswordBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const type = accPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                        accPasswordInput.setAttribute('type', type);
                    });
                }

                // --- ربط زر تسجيل الدخول الحقيقي (تعديل الربط المباشر) ---
                const realLoginBtn = document.getElementById('loginBtn');
                // --- 1. التحقق من الجلسة (Session) عند تحميل الصفحة ---
                if (realLoginBtn) {
                    const savedUser = localStorage.getItem('music_factory_user');
                    if (savedUser) {
                        try {
                            const userData = JSON.parse(savedUser);
                            // لو مفيش username، هناخد الجزء الأول من الإيميل (اللي قبل الـ @)
                            const displayName = userData.username || userData.email.split('@')[0];
                            realLoginBtn.innerHTML = `✅ متصل: ${displayName}`;
                            realLoginBtn.classList.add('btn-success');
                        } catch (error) {
                            console.error("خطأ في قراءة بيانات الجلسة:", error);
                        }
                    }
                }
                // ----------------------------------------------------
                
                if (realLoginBtn) {
                    realLoginBtn.onclick = async (e) => {
                        e.preventDefault(); // إيقاف تحديث الصفحة الإجباري
                        // سحب القيم مباشرة من الحقول في لحظة الضغط
                        const emailField = document.getElementById('accEmailInput');
                        const passField = document.getElementById('accPasswordInput');
                        
                        const email = emailField ? emailField.value.trim() : '';
                        const password = passField ? passField.value : '';

                        if (!email || !password) {
                            alert("برجاء إدخال الإيميل وكلمة المرور!");
                            return;
                        }

                        // حفظ الحالة الأصلية للزر
                        const originalText = realLoginBtn.innerHTML;
                        realLoginBtn.innerHTML = '⏳ جاري التحقق...';
                        realLoginBtn.disabled = true; // تعطيل الزر لمنع التكرار

                        try {
                            const data = await NetworkManager.publicFetch('/api/auth/login', {
                                method: 'POST',
                                body: JSON.stringify({ email, password })
                            });

                            AuthManager.saveAuth(data.token, data.userData);
                            
                            alert("✅ " + data.message);
                            realLoginBtn.innerHTML = `✅ متصل: ${data.userData.username || data.userData.email.split('@')[0]}`;
                            realLoginBtn.classList.add('btn-success');
                            
                            const settingsPage = document.querySelector('.settings-page');
                            if (settingsPage) settingsPage.classList.remove('active');

                        } catch (error) {
                            console.error("Login Error:", error);
                            alert(`❌ خطأ في الاتصال: ${error.message}`);
                            realLoginBtn.innerHTML = originalText;
                            realLoginBtn.disabled = false;
                        }
                    };
                }
                // --- 3. ربط وظيفة إنشاء حساب جديد (Register) ---
// --- 3. ربط وظيفة إنشاء حساب جديد (Register) ---
const realRegisterBtn = document.getElementById('registerBtn');

if (realRegisterBtn) {
    realRegisterBtn.onclick = async (e) => {
        e.preventDefault(); 
        
        const emailField = document.getElementById('accEmailInput');
        const passField = document.getElementById('accPasswordInput');
        const nameField = document.getElementById('accNameInput'); 
        
        const email = emailField ? emailField.value.trim() : '';
        const password = passField ? passField.value : '';
        
        // التعديل السحري هنا: نتأكد إن الحقل موجود وفيه كلام، مش مجرد موجود وخلاص
        const name = (nameField && nameField.value.trim() !== '') ? nameField.value.trim() : email.split('@')[0];

        if (!email || password.length < 6) {
            alert("❌ برجاء إدخال إيميل صحيح وكلمة مرور لا تقل عن 6 أحرف!");
            return;
        }

        const originalText = realRegisterBtn.innerHTML;
        realRegisterBtn.innerHTML = '⏳ جاري إنشاء الحساب...';
        realRegisterBtn.disabled = true;

        try {
            const data = await NetworkManager.publicFetch('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({ 
                    username: name, 
                    name: name, 
                    email: email, 
                    password: password 
                })
            });

            // حفظ التوكن وبيانات المستخدم بعد التسجيل الناجح
            AuthManager.saveAuth(data.token, data.user);
            
            alert("🎉 تم إنشاء الحساب بنجاح! تم منحك رصيد مجاني للبدء.");
            
            // تحديث واجهة زر الدخول ليعكس حالة الاتصال
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) {
                loginBtn.innerHTML = `✅ متصل: ${data.user.name || data.user.email.split('@')[0]}`;
                loginBtn.classList.add('btn-success');
            }
            
            // إغلاق نافذة الإعدادات/الدخول
            const settingsPage = document.querySelector('.settings-page');
            if (settingsPage) settingsPage.classList.remove('active');

        } catch (error) {
            console.error("Register Error:", error);
            alert(`❌ خطأ في إنشاء الحساب: ${error.message}`);
        } finally {
            realRegisterBtn.innerHTML = originalText;
            realRegisterBtn.disabled = false;
        }
    };
}
                // --- 2. إضافة وظيفة تسجيل الخروج (Logout) ---
                document.body.addEventListener('click', (e) => {
                    // الاصطياد المزدوج: لو الزرار عنده الـ attribute بتاع الترجمة، أو الآي دي بتاعه logoutBtn
                    const isLogoutBtn = e.target.closest('[data-i18n="acc_logout"]') || e.target.id === 'logoutBtn';
                    
                    if (isLogoutBtn) {
                        e.preventDefault();
                        localStorage.removeItem('music_factory_user'); // مسح بيانات المستخدم
                        location.reload(); // إعادة تحميل الصفحة لترسيت الحالة
                    }
                });
                // ----------------------------------------

                document.addEventListener('keydown', (e) => {
                    const enableShortcutsCheck = document.getElementById('enableShortcutsCheck');
                    if (enableShortcutsCheck && !enableShortcutsCheck.checked) return;
                    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON' && e.target.id !== 'maestroChatInput') {
                        e.preventDefault();
                        if (dom.generatePromptBtn) dom.generatePromptBtn.click();
                    }
                    if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); FormManager.autoSave(); NotificationManager.showToast('toast_saved'); }
                    if (e.ctrlKey && e.key.toLowerCase() === 'z') { e.preventDefault(); FormManager.restoreFields(); }
                    if (e.ctrlKey && e.key.toLowerCase() === 'y') { e.preventDefault(); FormManager.restoreFields(); }
                });
            }
        };
    })();

    const MusicalCompatibilityEngine = (() => {
        const checkCompatibility = () => {
            const dom = UIController.getDOM();
            if (!dom.p_rhythmic_mode) return;
            const isAdvanced = dom.advancedOverrideToggle ? dom.advancedOverrideToggle.checked : false;
            const rMode = dom.p_rhythmic_mode.value;
            const r = dom.p_rhythm ? dom.p_rhythm.value : 'Auto';
            const f = dom.p_feeling.value;
            const t = dom.p_tempo.value;
            const m = dom.p_maqam.value;
            const inst = dom.p_instrumentation ? dom.p_instrumentation.value.toLowerCase() : '';
            let statuses = {
                p_rhythmic_mode: 'valid', p_rhythm: 'valid', p_feeling: 'valid',
                p_tempo: 'valid', p_maqam: 'valid', p_instrumentation: 'valid'
            };
            let suggestions = [];
            let score = 2;
            const fastRhythms = ['mahraganat', 'trap', 'fallahi', 'saidi', 'malfuf', 'dabke', 'fox', 'pop_khaliji'];
            const slowRhythms = ['waltz', 'samri', 'wahda_kabira'];
            const sadMoods = ['sad', 'tragic', 'romantic', 'nostalgic'];
            const joyfulMoods = ['joyful', 'danceable', 'festive', 'uplifting'];

            if (rMode === 'Ambient' && t === 'Fast') {
                suggestions.push("Ambient tracks generally require Slow or Medium tempo.");
                statuses.p_rhythmic_mode = 'invalid'; statuses.p_tempo = 'invalid';
                if (!isAdvanced) { dom.p_tempo.value = 'Slow'; statuses.p_tempo = 'valid'; }
                score = Math.min(score, 0);
            }
            if (sadMoods.includes(f) && t === 'Fast') {
                suggestions.push("Emotional/Sad moods conflict with Fast tempos.");
                statuses.p_feeling = 'invalid'; statuses.p_tempo = 'invalid';
                if (!isAdvanced) { dom.p_tempo.value = 'Slow'; statuses.p_tempo = 'valid'; }
                score = Math.min(score, 0);
            }
            if (joyfulMoods.includes(f) && t === 'Slow') {
                suggestions.push("Joyful/Danceable moods conflict with Slow tempos.");
                statuses.p_feeling = 'invalid'; statuses.p_tempo = 'invalid';
                if (!isAdvanced) { dom.p_tempo.value = 'Fast'; statuses.p_tempo = 'valid'; }
                score = Math.min(score, 0);
            }
            if (fastRhythms.includes(r) && sadMoods.includes(f)) {
                suggestions.push("Fast rhythms clash with Sad/Romantic moods. Consider 'Ambient' mode or Slow rhythms.");
                statuses.p_rhythm = 'invalid'; statuses.p_feeling = 'invalid';
                if (!isAdvanced && dom.p_rhythmic_mode) { dom.p_rhythmic_mode.value = 'Ambient'; dom.p_rhythm.value = 'None'; statuses.p_rhythm = 'valid'; }
                score = Math.min(score, 0);
            }
            if (slowRhythms.includes(r) && joyfulMoods.includes(f)) {
                suggestions.push("Slow rhythms (like Waltz) clash with Danceable/Festive moods.");
                statuses.p_rhythm = 'invalid'; statuses.p_feeling = 'invalid';
                if (!isAdvanced && dom.p_rhythm) { dom.p_rhythm.value = 'Auto'; statuses.p_rhythm = 'valid'; }
                score = Math.min(score, 0);
            }
            if (m === 'Saba' && !sadMoods.includes(f) && f !== 'Auto') {
                suggestions.push("Maqam Saba is highly sorrowful and best suits Sad/Tragic moods.");
                statuses.p_maqam = 'warning'; statuses.p_feeling = 'warning';
                score = Math.min(score, 1);
            }
            if (m === 'Ajam' && sadMoods.includes(f)) {
                suggestions.push("Maqam Ajam is bright and major-sounding, conflicting with Sad moods.");
                statuses.p_maqam = 'invalid'; statuses.p_feeling = 'invalid';
                if (!isAdvanced) { dom.p_maqam.value = 'Kurd'; statuses.p_maqam = 'valid'; }
                score = Math.min(score, 0);
            }
            Object.keys(statuses).forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                el.classList.remove('input-valid', 'input-warning', 'input-invalid');
                if (statuses[id] === 'valid' && selectHasValue(el)) el.classList.add('input-valid');
                else if (statuses[id] === 'warning') el.classList.add('input-warning');
                else if (statuses[id] === 'invalid') el.classList.add('input-invalid');
                const wrapper = document.getElementById(id + '_custom_input');
                if (wrapper) {
                    wrapper.classList.remove('input-valid', 'input-warning', 'input-invalid');
                    if (statuses[id] === 'valid' && selectHasValue(el)) wrapper.classList.add('input-valid');
                    else if (statuses[id] === 'warning') wrapper.classList.add('input-warning');
                    else if (statuses[id] === 'invalid') wrapper.classList.add('input-invalid');
                }
            });
            const ind = document.getElementById('compIndicator');
            const dot = document.getElementById('compDot');
            const text = document.getElementById('compText');
            if (ind && dot && text) {
                if (score === 2) {
                    dot.className = 'comp-dot comp-green';
                    text.innerText = TranslationEngine.getCurrentLang() === 'ar' ? 'توافق مثالي' : 'Perfect Harmony';
                } else if (score === 1) {
                    dot.className = 'comp-dot comp-yellow';
                    text.innerText = TranslationEngine.getCurrentLang() === 'ar' ? 'تحذير توافق' : 'Acceptable / Warning';
                } else {
                    dot.className = 'comp-dot comp-red';
                    text.innerText = isAdvanced ? (TranslationEngine.getCurrentLang() === 'ar' ? 'تعارض (تم التخطي)' : 'Conflict (Overridden)') : (TranslationEngine.getCurrentLang() === 'ar' ? 'تم تصحيح التعارض' : 'Auto-Corrected Conflict');
                }
            }
            const suggBox = document.getElementById('compSuggestions');
            const suggList = document.getElementById('compSuggestionsList');
            if (suggBox && suggList) {
                if (suggestions.length > 0) {
                    suggBox.style.display = 'block';
                    suggList.innerHTML = suggestions.map(s => `<li>${s}</li>`).join('');
                } else {
                    suggBox.style.display = 'none';
                    suggList.innerHTML = '';
                }
            }
            if (!isAdvanced && score === 0 && typeof UIEnhancementManager !== 'undefined') {
                UIEnhancementManager.syncDropdowns();
            }
        };
        const selectHasValue = (el) => {
            return el.value && el.value !== 'Auto' && el.value !== '' && el.value !== 'None';
        };
        return {
            init: () => {
                const dom = UIController.getDOM();
                const triggers = ['p_rhythmic_mode', 'p_rhythm', 'p_feeling', 'p_tempo', 'p_maqam'];
                triggers.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.addEventListener('change', () => MusicalCompatibilityEngine.updateIndicator());
                });
                const instInput = document.getElementById('p_instrumentation');
                if (instInput) instInput.addEventListener('change', () => MusicalCompatibilityEngine.updateIndicator());
                if (dom.advancedOverrideToggle) {
                    dom.advancedOverrideToggle.addEventListener('change', () => MusicalCompatibilityEngine.updateIndicator());
                }
                setTimeout(() => MusicalCompatibilityEngine.updateIndicator(), 500);
            },
            updateIndicator: () => {
                checkCompatibility();
            }
        };
    })();

    const UIEnhancementManager = (() => {
        return {
            init: () => {
                document.querySelectorAll('select.searchable-native').forEach(selectEl => {
                    UIEnhancementManager.buildSearchableDropdown(selectEl);
                });
            },
            flash: (elId) => {
                const el = document.getElementById(elId);
                if (el) {
                    el.classList.remove('highlight-flash');
                    void el.offsetWidth;
                    el.classList.add('highlight-flash');
                }
                const wrapper = document.getElementById(elId + '_custom_wrapper');
                if (wrapper) {
                    wrapper.classList.remove('highlight-flash');
                    void wrapper.offsetWidth;
                    wrapper.classList.add('highlight-flash');
                }
            },
            syncDropdowns: () => {
                document.querySelectorAll('select.searchable-native').forEach(selectEl => {
                    const customInput = document.getElementById(selectEl.id + '_custom_input');
                    if (customInput && selectEl.options[selectEl.selectedIndex]) {
                        customInput.value = selectEl.options[selectEl.selectedIndex].text;
                    }
                });
                const dom = UIController.getDOM();
                if (dom.p_rhythmic_mode) {
                    const wrapper = document.getElementById('p_rhythm_custom_wrapper');
                    if (dom.p_rhythmic_mode.value === 'Ambient') {
                        if (wrapper) { wrapper.style.pointerEvents = 'none'; wrapper.style.opacity = '0.5'; }
                    } else {
                        if (wrapper) { wrapper.style.pointerEvents = 'auto'; wrapper.style.opacity = '1'; }
                    }
                }
            },
            buildSearchableDropdown: (selectEl) => {
                selectEl.style.display = 'none';
                const wrapper = document.createElement('div');
                wrapper.className = 'searchable-select-wrapper';
                wrapper.id = selectEl.id + '_custom_wrapper';
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'searchable-select-input';
                input.id = selectEl.id + '_custom_input';
                input.placeholder = "Search / ابحث...";
                if (selectEl.options.length > 0) input.value = selectEl.options[selectEl.selectedIndex].text;
                const dropdown = document.createElement('div');
                dropdown.className = 'searchable-options';
                const populateDropdown = (filter = "") => {
                    dropdown.innerHTML = "";
                    const frag = document.createDocumentFragment();
                    Array.from(selectEl.children).forEach(child => {
                        if (child.tagName.toLowerCase() === 'optgroup') {
                            let hasVisibleChild = false;
                            const groupDiv = document.createElement('div');
                            groupDiv.className = 'searchable-optgroup';
                            groupDiv.innerText = child.label;
                            const groupContainer = document.createElement('div');
                            Array.from(child.children).forEach(opt => {
                                if (opt.text.toLowerCase().includes(filter.toLowerCase())) {
                                    hasVisibleChild = true;
                                    const optDiv = document.createElement('div');
                                    optDiv.className = 'searchable-option';
                                    optDiv.textContent = opt.text;
                                    optDiv.addEventListener('mousedown', () => {
                                        selectEl.value = opt.value;
                                        input.value = opt.text;
                                        dropdown.classList.remove('active');
                                        selectEl.dispatchEvent(new Event('change'));
                                    });
                                    groupContainer.appendChild(optDiv);
                                }
                            });
                            if (hasVisibleChild) {
                                frag.appendChild(groupDiv);
                                frag.appendChild(groupContainer);
                            }
                        } else if (child.tagName.toLowerCase() === 'option') {
                            if (child.text.toLowerCase().includes(filter.toLowerCase())) {
                                const optDiv = document.createElement('div');
                                optDiv.className = 'searchable-option';
                                optDiv.textContent = child.text;
                                optDiv.addEventListener('mousedown', () => {
                                    selectEl.value = child.value;
                                    input.value = child.text;
                                    dropdown.classList.remove('active');
                                    selectEl.dispatchEvent(new Event('change'));
                                });
                                frag.appendChild(optDiv);
                            }
                        }
                    });
                    dropdown.appendChild(frag);
                };
                input.addEventListener('focus', () => { populateDropdown(""); dropdown.classList.add('active'); });
                input.addEventListener('input', (e) => populateDropdown(e.target.value));
                input.addEventListener('blur', () => {
                    setTimeout(() => dropdown.classList.remove('active'), 150);
                    if (selectEl.options[selectEl.selectedIndex]) input.value = selectEl.options[selectEl.selectedIndex].text;
                });
                populateDropdown("");
                wrapper.appendChild(input);
                wrapper.appendChild(dropdown);
                selectEl.parentNode.insertBefore(wrapper, selectEl.nextSibling);
            }
        };
    })();

    const ProjectSessionManager = (() => {
        const PROJECTS_KEY = 'musicFactory_projects';
        const updateDropdown = () => {
            const select = document.getElementById('loadProjectSelect');
            if (!select) return;
            select.innerHTML = `<option value="">${TranslationEngine.get('opt_saved_projects')}</option>`;
            const projects = StorageManager.load(PROJECTS_KEY) || {};
            const frag = document.createDocumentFragment();
            for (let key in projects) {
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = key;
                frag.appendChild(opt);
            }
            select.appendChild(frag);
        };
        return {
            init: () => {
                updateDropdown();
                document.getElementById('btnSaveProject').addEventListener('click', () => {
                    const name = document.getElementById('projectName').value.trim();
                    if (!name) { NotificationManager.showToast('toast_failed'); return; }
                    const currentData = StorageManager.load('mf_savedData') || {};
                    const projects = StorageManager.load(PROJECTS_KEY) || {};
                    projects[name] = currentData;
                    StorageManager.save(PROJECTS_KEY, projects);
                    updateDropdown();
                    NotificationManager.showToast('toast_saved');
                });
                document.getElementById('btnLoadProject').addEventListener('click', () => {
                    const name = document.getElementById('loadProjectSelect').value;
                    if (!name) return;
                    const projects = StorageManager.load(PROJECTS_KEY) || {};
                    if (projects[name]) {
                        StorageManager.save('mf_savedData', projects[name]);
                        FormManager.loadSavedData();
                        NotificationManager.showToast('toast_restored');
                    }
                });
            }
        };
    })();

    const DailyCreditManager = (() => {
        const MAX_CREDITS = 10;
        const CREDIT_KEY = 'musicFactoryCredits';
        const DATE_KEY = 'musicFactoryLastResetDate';
        const checkAndReset = () => {
            const today = new Date().toDateString();
            const lastReset = StorageManager.load(DATE_KEY);
            if (lastReset !== today) {
                StorageManager.save(CREDIT_KEY, MAX_CREDITS);
                StorageManager.save(DATE_KEY, today);
            }
        };
        return {
            init: () => {
                checkAndReset();
                const dom = UIController.getDOM();
                if (dom.creditCountSettings) dom.creditCountSettings.innerText = DailyCreditManager.getCredits();
            },
            getCredits: () => {
                checkAndReset();
                const credits = StorageManager.load(CREDIT_KEY);
                return credits !== null ? parseInt(credits) : MAX_CREDITS;
            },
            consume: () => {
                checkAndReset();
                let credits = DailyCreditManager.getCredits();
                if (credits > 0) {
                    credits--;
                    StorageManager.save(CREDIT_KEY, credits);
                    const dom = UIController.getDOM();
                    if (dom.creditCountSettings) dom.creditCountSettings.innerText = credits;
                    return true;
                }
                return false;
            }
        };
    })();

    const PresetLibraryEngine = (() => {
        const translate = (ar, en) => TranslationEngine.translateDirect(ar, en);
        const songPresets = [
            { ar: "أغنية بوب مصري سريع", en: "Fast Egyptian Pop", data: { rhythm: "fox", feeling: "danceable", vocals: "Male vocal", tempo: "Fast", maqam: "Bayati", rhythmicMode: "Rhythmic", instrumentation: "Intro: Synthesizer, Drum Kit | Verse: Drum Kit | Chorus: Electric Bass, Synthesizer", trackType: "full", duration: 180 } },
            { ar: "أغنية رومانسية هادئة", en: "Quiet Romantic Song", data: { rhythm: "maqsum", feeling: "romantic", vocals: "Female vocal", tempo: "Slow", maqam: "Kurd", rhythmicMode: "Hybrid", instrumentation: "Intro: Acoustic Guitar, Piano | Verse: Piano | Chorus: Violins", trackType: "full", duration: 180 } },
            { ar: "أغنية مهرجانات شعبي", en: "Popular Mahraganat", data: { rhythm: "mahraganat", feeling: "danceable", vocals: "Male vocal", tempo: "Fast", maqam: "Bayati", rhythmicMode: "Rhythmic", instrumentation: "Intro: Synthesizer, Drum Kit | Verse: Drum Kit | Chorus: Electric Bass, Synthesizer", trackType: "full", duration: 180 } },
            { ar: "أغنية راب/تراب مصري", en: "Egyptian Trap/Rap", data: { rhythm: "trap", feeling: "powerful", vocals: "Male vocal", tempo: "Medium", maqam: "Nahawand", rhythmicMode: "Rhythmic", instrumentation: "Intro: Synthesizer, Electric Bass | Verse: Drum Kit | Chorus: Electric Bass, Synthesizer", trackType: "full", duration: 180 } },
            { ar: "أغنية دراما وحزن عميق", en: "Deep Sad Drama", data: { rhythm: "waltz", feeling: "sad", vocals: "Female vocal", tempo: "Slow", maqam: "Saba", rhythmicMode: "Ambient", instrumentation: "Intro: Cello | Verse: Cello, Double Bass | Chorus: Violins", trackType: "full", duration: 180 } },
            { ar: "أغنية فرح بلدي", en: "Baladi Wedding Song", data: { rhythm: "baladi", feeling: "festive", vocals: "Group vocal harmony", tempo: "Fast", maqam: "Rast", rhythmicMode: "Rhythmic", instrumentation: "Intro: Accordion, Tabla | Verse: Tabla | Chorus: Accordion, Req", trackType: "full", duration: 180 } }
        ];
        const cinematicCategories = {
            "         🎬          موسيقى سينمائية": { en: "         🎬          Cinematic Music", subs: {} },
            "         ⚽          موسيقى رياضية": { en: "         ⚽          Sports Music", subs: {} },
            "         🕌          موسيقى دينية": { en: "         🕌          Religious Music", subs: {} },
            "         🧠          موسيقى علاجية": { en: "         🧠          Healing Music", subs: {} },
            "         🎮          موسيقى ألعاب": { en: "         🎮          Gaming Music", subs: {} }
        };
        const cinematicPopulator = [
            { cat: "         🎬          موسيقى سينمائية", ar: "مشهد رومانسي هادئ", en: "Quiet Romantic Scene", r: "None", f: "romantic", m: "Nahawand", t: "Slow", scene: "Romantic", dial: "Yes", dens: "Low", rMode: "Ambient", inst: "Intro: Piano, Cello | Verse: Piano | Chorus: Violins", trackType: "full", dur: 120 },
            { cat: "         🎬          موسيقى سينمائية", ar: "مشهد درامي ملحمي", en: "Epic Dramatic Scene", r: "military_march", f: "epic", m: "Kurd", t: "Medium", scene: "Drama", dial: "No", dens: "High", rMode: "Hybrid", inst: "Intro: Brass, Timpani | Verse: Violins, Cello | Chorus: Full Orchestra", trackType: "full", dur: 180 }
        ];
        for (let i = 0; i < cinematicPopulator.length; i++) {
            let template = cinematicPopulator[i];
            cinematicCategories[template.cat].subs[`${template.ar}`] = {
                en: `${template.en}`,
                data: {
                    rhythm: template.r, feeling: template.f, vocals: "Instrumental Solo, No Vocals", tempo: template.t, maqam: template.m,
                    cineScene: template.scene, cineDialogue: template.dial, cineDensity: template.dens,
                    rhythmicMode: template.rMode, instrumentation: template.inst, trackType: template.trackType, duration: template.dur
                }
            };
        }
        const fillUIFields = (dataObj) => {
            const mappings = {
                rhythm: 'p_rhythm', feeling: 'p_feeling', vocals: 'p_vocals', tempo: 'p_tempo', maqam: 'p_maqam',
                cineScene: 'cineScene', cineDialogue: 'cineDialogue', cineDensity: 'cineDensity',
                rhythmicMode: 'p_rhythmic_mode', instrumentation: 'p_instrumentation', trackType: 'p_track_type', duration: 'p_duration'
            };
            for (let key in dataObj) {
                if (mappings[key]) {
                    const el = document.getElementById(mappings[key]);
                    if (el) {
                        el.value = dataObj[key];
                        el.dispatchEvent(new Event('change'));
                        if (typeof UIEnhancementManager !== 'undefined') {
                            UIEnhancementManager.flash(mappings[key]);
                        }
                    }
                }
            }
            if (typeof OrchestrationManager !== 'undefined') OrchestrationManager.init();
            if (typeof MusicEngine !== 'undefined' && MusicEngine.triggerImmersiveMood) MusicEngine.triggerImmersiveMood();
            if (typeof DurationManager !== 'undefined') DurationManager.update();
            if (typeof FormManager !== 'undefined' && FormManager.autoSave) FormManager.autoSave();
            if (typeof UIEnhancementManager !== 'undefined') UIEnhancementManager.syncDropdowns();
        };
        return {
            init: () => {
                const oldLib = document.getElementById('oldPromptLibContainer');
                if (oldLib) oldLib.style.display = 'none';
                const tabMelody = document.getElementById('tab-melody');
                if (!tabMelody) return;
                const libContainer = document.createElement('div');
                libContainer.id = 'unifiedLibraryContainer';
                libContainer.className = 'card';
                libContainer.style.marginBottom = '20px';
                tabMelody.insertBefore(libContainer, tabMelody.children[1]);
                const songLibDiv = document.createElement('div');
                songLibDiv.id = 'songLibraryUI';
                const songTitle = translate("         📚          مكتبة النماذج الغنائية", "         📚          Song Prompt Library");
                const songDefault = translate("-- اختر نموذج أغنية جاهز --", "-- Choose a Song Preset --");
                let songOpts = `<option value="">${songDefault}</option>`;
                songPresets.forEach((p, i) => { songOpts += `<option value="${i}">${translate(p.ar, p.en)}</option>`; });
                songLibDiv.innerHTML = `
                <div class="section-title"><span id="lbl_songLibTitle">${songTitle}</span></div>
                <select id="songPresetSelect" class="neon-box" aria-label="Song Preset Select">${songOpts}</select>
            `;
                const cineLibDiv = document.createElement('div');
                cineLibDiv.id = 'cineLibraryUI';
                cineLibDiv.style.display = 'none';
                const cineTitle = translate("         🎥          المكتبة السينمائية والتصويرية", "         🎥          Cinematic Library");
                const cineMainDef = translate("-- اختر التصنيف الأساسي --", "-- Select Main Category --");
                let cineMainOpts = `<option value="">${cineMainDef}</option>`;
                Object.keys(cinematicCategories).forEach(key => {
                    cineMainOpts += `<option value="${key}">${translate(key, cinematicCategories[key].en)}</option>`;
                });
                const extraCineFieldsHTML = `
                <div class="pillars-grid" style="margin-top:20px; border-top: 1px dashed var(--neon-purple); padding-top: 15px;">
                    <div class="pillar">
                        <label id="lbl_cat_scene">${translate("نوع المشهد:", "Scene Type:")}</label>
                        <input type="text" id="cineScene" class="neon-box lyric-input" placeholder="${translate("مثال: دراما، أكشن", "e.g., Drama, Action")}">
                    </div>
                    <div class="pillar">
                        <label id="lbl_cat_dialogue">${translate("وجود حوار:", "Dialogue Presense:")}</label>
                        <select id="cineDialogue" class="neon-box">
                            <option value="No">${translate("لا يوجد (موسيقى مرتفعة)", "No (Loud Music)")}</option>
                            <option value="Yes">${translate("نعم (موسيقى هادئة)", "Yes (Soft Background)")}</option>
                        </select>
                    </div>
                    <div class="pillar">
                        <label id="lbl_cat_density">${translate("كثافة الموسيقى:", "Music Density:")}</label>
                        <select id="cineDensity" class="neon-box">
                            <option value="Auto">${translate("تلقائي", "Auto")}</option>
                            <option value="Medium">${translate("متوسطة", "Medium")}</option>
                            <option value="Low">${translate("خفيفة (آلات قليلة)", "Low (Few Instruments)")}</option>
                            <option value="High">${translate("عالية (أوركسترا كاملة)", "High (Full Orchestra)")}</option>
                            <option value="Very High">${translate("ملحمية قوية", "Very High (Epic)")}</option>
                        </select>
                    </div>
                </div>
            `;
                cineLibDiv.innerHTML = `
                <div class="section-title"><span id="lbl_cineLibTitle">${cineTitle}</span></div>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <select id="cineMainSel" class="neon-box" aria-label="Main Cinematic Category">${cineMainOpts}</select>
                    <select id="cineSubSel" class="neon-box" style="display:none;" aria-label="Sub Cinematic Category"></select>
                </div>
                ${extraCineFieldsHTML}
            `;
                libContainer.appendChild(songLibDiv);
                libContainer.appendChild(cineLibDiv);
                document.getElementById('songPresetSelect').addEventListener('change', (e) => {
                    if (e.target.value !== "") fillUIFields(songPresets[e.target.value].data);
                });
                const cineMainSel = document.getElementById('cineMainSel');
                const cineSubSel = document.getElementById('cineSubSel');
                cineMainSel.addEventListener('change', (e) => {
                    cineSubSel.style.display = 'none';
                    cineSubSel.innerHTML = '';
                    if (!e.target.value) return;
                    const subs = cinematicCategories[e.target.value].subs;
                    const frag = document.createDocumentFragment();
                    const defaultOpt = document.createElement('option');
                    defaultOpt.value = "";
                    defaultOpt.textContent = translate("-- اختر المشهد --", "-- Select Scene --");
                    frag.appendChild(defaultOpt);
                    Object.keys(subs).forEach(subKey => {
                        const opt = document.createElement('option');
                        opt.value = subKey;
                        opt.textContent = translate(subKey, subs[subKey].en);
                        frag.appendChild(opt);
                    });
                    cineSubSel.appendChild(frag);
                    cineSubSel.style.display = 'block';
                });
                cineSubSel.addEventListener('change', (e) => {
                    if (!e.target.value) return;
                    const mainVal = cineMainSel.value;
                    const data = cinematicCategories[mainVal].subs[e.target.value].data;
                    fillUIFields(data);
                });
            },
            toggleMode: (isInst) => {
                const sLib = document.getElementById('songLibraryUI');
                const cLib = document.getElementById('cineLibraryUI');
                if (sLib) sLib.style.display = isInst ? 'none' : 'block';
                if (cLib) cLib.style.display = isInst ? 'block' : 'none';
            },
            translateUI: () => {
                const sLibTitle = document.getElementById('lbl_songLibTitle');
                if (sLibTitle) sLibTitle.textContent = translate("         📚          مكتبة النماذج الغنائية", "         📚          Song Prompt Library");
                const sSelect = document.getElementById('songPresetSelect');
                if (sSelect) {
                    sSelect.options[0].textContent = translate("-- اختر نموذج أغنية جاهز --", "-- Choose a Song Preset --");
                    for (let i = 1; i < sSelect.options.length; i++) {
                        sSelect.options[i].textContent = translate(songPresets[i - 1].ar, songPresets[i - 1].en);
                    }
                }
                const cLibTitle = document.getElementById('lbl_cineLibTitle');
                if (cLibTitle) cLibTitle.textContent = translate("         🎥          المكتبة السينمائية والتصويرية", "         🎥          Cinematic Library");
                const cineMainSel = document.getElementById('cineMainSel');
                if (cineMainSel) {
                    cineMainSel.options[0].textContent = translate("-- اختر التصنيف الأساسي --", "-- Select Main Category --");
                    let mIdx = 1;
                    for (let k in cinematicCategories) {
                        cineMainSel.options[mIdx].textContent = translate(k, cinematicCategories[k].en);
                        mIdx++;
                    }
                }
                const lblScene = document.getElementById('lbl_cat_scene');
                if (lblScene) lblScene.textContent = translate("نوع المشهد:", "Scene Type:");
                const lblDial = document.getElementById('lbl_cat_dialogue');
                if (lblDial) lblDial.textContent = translate("وجود حوار:", "Dialogue Presense:");
                const lblDens = document.getElementById('lbl_cat_density');
                if (lblDens) lblDens.textContent = translate("كثافة الموسيقى:", "Music Density:");
            }
        };
    })();

    const MaestroAssistantManager = (() => {
        let isGenerating = false;
        let DOM = {};

        const cacheDOM = () => {
            DOM = {
                fab: document.getElementById('maestroFab'),
                chatWindow: document.getElementById('maestroChatWindow'),
                chatBody: document.getElementById('maestroChatBody'),
                chatInput: document.getElementById('maestroChatInput'),
                sendBtn: document.getElementById('maestroSendBtn'),
                closeBtn: document.getElementById('maestroCloseBtn')
            };
        };

        const toggleChat = () => {
            if (DOM.chatWindow) {
                DOM.chatWindow.classList.toggle('active');
                if (DOM.chatWindow.classList.contains('active') && DOM.chatInput) {
                    DOM.chatInput.focus();
                }
            }
        };

        const addMessage = (text, sender) => {
    const msg = document.createElement('div');
    msg.className = `maestro-msg ${sender}`;
    DOM.chatBody.appendChild(msg);

    if (sender === 'ai') {
        let i = 0;
        const speed = 25; 
        msg.textContent = ''; // استخدام textContent لضمان دقة المسافات

        function typeWriter() {
            if (i < text.length) {
                // إضافة الحرف مع الحفاظ على المسافة كما هي في النص الأصلي
                msg.textContent += text.charAt(i);
                i++;
                DOM.chatBody.scrollTop = DOM.chatBody.scrollHeight;
                setTimeout(typeWriter, speed);
            }
        }
        typeWriter();
    } else {
        msg.textContent = text;
        DOM.chatBody.scrollTop = DOM.chatBody.scrollHeight;
    }
};

        const handleSend = async () => {
            if (isGenerating) return;
            const userMessage = DOM.chatInput.value.trim();
            if (!userMessage) return;

            isGenerating = true;
            if (DOM.sendBtn) DOM.sendBtn.disabled = true;
            addMessage(userMessage, 'user');
            if (DOM.chatInput) DOM.chatInput.value = '';

            try {
                // 👇 التعديل الجوهري هنا: بنستخدم المسار الصح وبنستخدم NetworkManager
                // في ملف script.js - دالة handleSend
const data = await NetworkManager.authenticatedFetch('/api/chat', { // رجعنا الـ api هنا
    method: 'POST',
    body: JSON.stringify({ 
        message: userMessage,
        sessionId: 'user-1' 
    })
});

                if (data && data.reply) {
                    addMessage(data.reply, 'ai');
                }
            } catch (e) {
                console.error("Maestro Chat Error:", e);
                
                // لو السيرفر رد بـ 401 (غير مصرح) أو الجلسة انتهت
                if (e.message === "SESSION_EXPIRED" || e.message.includes("401")) {
                    addMessage("🔒 المايسترو يحتاج للتعرف عليك أولاً. يرجى تسجيل الدخول للوصول لقدراتي الكاملة.", 'ai');
                    
                    // نفتح له المودال بتاع تسجيل الدخول "الذكي" اللي صلحناه
                    setTimeout(() => {
                        if (typeof ModalManager !== 'undefined') ModalManager.showLogin();
                    }, 1500);
                } else {
                    // أي خطأ تاني (زي إن السيرفر مش شغال)
                    addMessage("عذراً، حدث خطأ في الاتصال بالسيرفر. اتأكد إن السيرفر شغال.", 'ai');
                }
            } finally {
                isGenerating = false;
                if (DOM.sendBtn) DOM.sendBtn.disabled = false;
                if (DOM.chatInput) DOM.chatInput.focus();
            }
        };

        const bindEvents = () => {
            if (DOM.fab) DOM.fab.onclick = toggleChat;
            if (DOM.closeBtn) DOM.closeBtn.onclick = toggleChat;
            if (DOM.sendBtn) DOM.sendBtn.onclick = handleSend;
            
            if (DOM.chatInput) {
                DOM.chatInput.onkeydown = (e) => { 
                    if (e.key === 'Enter') {
                        e.preventDefault(); // بيمنع السطر الجديد في الـ textarea
                        handleSend();
                    }
                };
            }
        }; // قفلة bindEvents

        return {
            init: () => {
                cacheDOM();
                bindEvents();
            },
            say: (text) => {
                // 1. التأكد إن العنصر موجود في الـ HTML عشان نتجنب الإيرور
                if (!DOM.chatBody) {
                    console.warn("عنصر maestroChatBody غير موجود في ملف HTML!");
                    return;
                }
                // 2. فتح نافذة الشات أوتوماتيك لو كانت مقفولة
                if (DOM.chatWindow && !DOM.chatWindow.classList.contains('active')) {
                    DOM.chatWindow.classList.add('active');
                }
                // 3. إضافة الرسالة
                addMessage(text, 'ai');
            }
        };
    })();
const MusicLibraryManager = (() => {
    const buildUI = () => {
        if (document.getElementById('mf-library-panel')) return;
        const panel = document.createElement('div');
        panel.id = 'mf-library-panel';
        Object.assign(panel.style, {
            position: 'fixed', top: '0', left: '-100%', width: '100%', maxWidth: '350px', boxSizing: 'border-box', height: '100vh',
            background: 'rgba(15, 32, 39, 0.98)', borderRight: '2px solid #bc13fe',
            zIndex: '9998', transition: 'left 0.4s ease', padding: '25px', overflowY: 'auto',
            color: 'white', fontFamily: "'Cairo', sans-serif"
        });
        panel.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #bc13fe; padding-bottom:15px; margin-bottom:20px;">
                <h2 style="margin:0; font-size:20px; color:#00d2ff;">📂 مكتبتي</h2>
                <button id="closeLibraryBtn" style="background:none; border:none; color:white; font-size:30px; cursor:pointer;">&times;</button>
            </div>
            <div id="library-songs-list" style="display:flex; flex-direction:column; gap:15px;"></div>
        `;
        
        // PATCH #2 (Updated): إنشاء الـ Backdrop بشكل آمن جداً
        if (!document.getElementById('mf-library-backdrop')) {
            const backdrop = document.createElement('div');
            backdrop.id = 'mf-library-backdrop';
            Object.assign(backdrop.style, {
                position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
                background: 'rgba(0,0,0,0.5)', zIndex: '9997', display: 'none'
            });
            backdrop.onclick = () => {
                const closeBtn = document.getElementById('closeLibraryBtn');
                if (closeBtn) closeBtn.click();
            };
            document.body.appendChild(backdrop);
        }
        
        document.body.appendChild(panel);
        
        // PATCH #3: إغلاق القائمة وإخفاء الـ Backdrop
        document.getElementById('closeLibraryBtn').onclick = () => { 
            panel.style.left = '-100%'; 
            document.getElementById('mf-library-backdrop').style.display = 'none'; 
        };

        const navbar = document.querySelector('.global-navbar') || document.body;
        if (!document.getElementById('openLibraryBtn')) {
            const openBtn = document.createElement('button');
            openBtn.id = 'openLibraryBtn';
            openBtn.innerHTML = '🎧 مكتبتي';
            Object.assign(openBtn.style, {
                background: 'rgba(188, 19, 254, 0.2)', border: '1px solid #bc13fe',
                borderRadius: '20px', padding: '8px 15px', color: 'white', cursor: 'pointer', 
                position: navbar === document.body ? 'fixed' : 'static', top: '10px', left: '10px', zIndex: '9997'
            });
            
            // PATCH #4: إظهار الـ Backdrop عند الفتح
            openBtn.onclick = () => { 
                document.getElementById('mf-library-backdrop').style.display = 'block'; 
                panel.style.left = '0'; 
                MusicLibraryManager.load(); 
            }; 
            
            navbar.appendChild(openBtn);
        }
    };
    return {
        init: () => { buildUI(); },
        load: async () => {
            const list = document.getElementById('library-songs-list');
            if (!list) return;
            
            const token = localStorage.getItem('music_factory_token');
            if(!token) {
                list.innerHTML = '<p style="text-align:center; color:#ffdd57;">المحتوى مغلق. يرجى تسجيل الدخول.</p>';
                ModalManager.showLogin(); 
                return;
            }

            try { // <--- دي الكلمة اللي كانت ناقصة عشان الـ catch اللي تحت تشتغل
                const url = `${Config.API_BASE_URL}/api/songs/my-songs`;
                const response = await fetch(url, { 
                    headers: { 'Authorization': 'Bearer ' + token } 
                });
                const data = await response.json();
                
                list.innerHTML = '';
                if (!data.songs || data.songs.length === 0) { 
                    list.innerHTML = '<p style="text-align:center; color:#ccc;">لا توجد ألحان محفوظة بعد.</p>'; 
                    return; 
                }
                
                data.songs.forEach(song => {
                    const card = document.createElement('div');
                    card.style.cssText = "background:rgba(255,255,255,0.05); padding:15px; border-radius:12px; border:1px solid #333; margin-bottom:10px;";
                    card.innerHTML = `
                        <div style="margin-bottom:10px;">${song.prompt ? song.prompt.substring(0, 30) + '...' : 'لحن جديد'}</div>
                        <div style="color:${song.status === 'completed' ? '#00d2ff' : '#ffdd57'}">
                            ${song.status === 'completed' ? '✅ اكتمل' : '⏳ جاري'}
                        </div>`;
                    list.appendChild(card);
                });
            } catch (error) { 
                list.innerHTML = '<p style="text-align:center; color:#ff3860;">❌ فشل تحميل المكتبة</p>'; 
            }
        }
    };
})();
// تشغيل التطبيق بالكامل (مكانه خارج غلاف App)

const ModalManager = (() => {
    return {
        showLogin: () => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.zIndex = '10005';
            const modal = document.createElement('div');
            modal.className = 'modal-content';
            modal.innerHTML = `
                <h3 style="color: var(--neon-red); margin-top: 0; font-family: 'Cairo', sans-serif;">تنبيه 🔒</h3>
                <p style="margin-bottom: 25px; line-height: 1.6; font-family: 'Cairo', sans-serif;">يرجى تسجيل الدخول أولاً للوصول إلى هذه الميزة.</p>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button id="loginNowBtn" class="btn-3d btn-blue" style="margin:0; width: auto; padding: 10px 25px; font-size: 16px;">تسجيل الدخول الآن</button>
                    <button id="closeLoginBtn" class="btn-3d btn-danger" style="margin:0; width: auto; padding: 10px 25px; font-size: 16px;">إلغاء</button>
                </div>
            `;
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('active'));

            const closeAll = () => {
                overlay.classList.remove('active');
                setTimeout(() => overlay.remove(), 300);
                const libPanel = document.getElementById('mf-library-panel');
                if (libPanel) libPanel.style.left = '-100%';
                const backdrop = document.getElementById('mf-library-backdrop');
                if (backdrop) backdrop.style.display = 'none';
            };

            // زرار تسجيل الدخول الآن
            document.getElementById('loginNowBtn').onclick = (e) => {
                e.stopPropagation(); // الكلمة السحرية اللي هتمنع قفل الإعدادات فوراً
                closeAll();
                
                const dom = window.UIController.getDOM();
                if (dom && dom.settingsPage) {
                    // فتح لوحة الإعدادات
                    dom.settingsPage.classList.add('active');
                    
                    // محاكاة الضغط على قسم الحساب
                    const accountTab = document.querySelector('.settings-sidebar button[data-target="account-section"]');
                    if (accountTab) accountTab.click();

                    // تركيز على خانة الإيميل
                    setTimeout(() => {
                        const emailInput = document.getElementById('accEmailInput');
                        if (emailInput) emailInput.focus();
                    }, 500);
                }
            };

            // زرار إلغاء (يقفل المودال بس)
            document.getElementById('closeLoginBtn').onclick = (e) => {
                e.stopPropagation();
                closeAll();
            };
        },
        confirm: (title, message, onConfirm) => {
            // إنشاء المودال ديناميكياً عشان مانزحمش الـ HTML
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.zIndex = '10005'; // لضمان ظهوره فوق كل حاجة
            
            const modal = document.createElement('div');
            modal.className = 'modal-content';
            
            modal.innerHTML = `
                <h3 style="color: var(--neon-red); margin-top: 0; font-family: 'Cairo', sans-serif;">${title}</h3>
                <p style="margin-bottom: 25px; line-height: 1.6; font-family: 'Cairo', sans-serif;">${message}</p>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button id="confirmYes" class="btn-3d btn-danger" style="margin:0; width: auto; padding: 10px 25px; font-size: 16px;">نعم، ابدأ من جديد</button>
                    <button id="confirmNo" class="btn-3d btn-blue" style="margin:0; width: auto; padding: 10px 25px; font-size: 16px;">إلغاء</button>
                </div>
            `;
            
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            
            // أنيميشن الظهور
            requestAnimationFrame(() => overlay.classList.add('active'));

            // دالة الإغلاق
            const close = () => {
                overlay.classList.remove('active');
                setTimeout(() => overlay.remove(), 300);
            };

            // ربط الأزرار
            document.getElementById('confirmYes').onclick = () => {
                onConfirm();
                close();
            };
            document.getElementById('confirmNo').onclick = close;
        }
    };
})();
   // استبدل موديول FounderManager القديم بهذا الكود حرفياً
    const FounderManager = (() => {
        const updateUI = (data, isLoading = false) => {
            const nameEl = document.querySelector('.dev-name');
            const bioEl = document.querySelector('.dev-bio p');
            const titleEl = document.querySelector('.dev-title');
            const footerNameEl = document.getElementById('openFounderBtnFooter');

            if (isLoading) return;

            // البيانات اللي اتفقنا عليها
            const brandName = 'حسين الملك';
            const hybridTitle = 'Founder • Composer • AI Music Architect';
            const cinematicBio = `حسين محمد سيد عبدالعال، المعروف فنياً باسم "حسين الملك"، هو شاعر غنائي وملحن ومبرمج تطبيقات موسيقية، وباحث أكاديمي بجامعة القاهرة، بالإضافة إلى كونه عازفاً لآلة الكونترباص. يجمع في مسيرته بين الحس الفني والخبرة التقنية، حيث عمل على تطوير رؤى موسيقية حديثة تمزج بين الإبداع الإنساني وتقنيات الذكاء الاصطناعي.

له عدد من المؤلفات الغنائية والموسيقية، ويهتم بمجالات الموسيقى التعبيرية والعلاج بالموسيقى، مع تركيز خاص على توظيف التكنولوجيا لخدمة العملية الإبداعية وتوسيع فرص الوصول إلى الإنتاج الموسيقي.

قام بتأسيس وبرمجة منصة “Mu | Music Factory AI” بهدف إتاحة أدوات ذكية تساعد المبدعين على تحويل أفكارهم إلى أعمال موسيقية متكاملة بسهولة واحترافية، سواء كانوا شعراء، صناع محتوى، يوتيوبرز، مخرجين سينمائيين، أو منتجي وسائط رقمية يبحثون عن موسيقى تصويرية وألحان تعبّر عن رؤيتهم الفنية.`;

            // التنفيذ في الواجهة
            if(nameEl) nameEl.innerText = brandName;
            if(titleEl) titleEl.innerText = hybridTitle;
            if(bioEl) bioEl.innerText = cinematicBio;
            if(footerNameEl) footerNameEl.innerText = brandName;
        };

        const fetchFounderData = async () => {
            updateUI({}, true); 
            try {
                const data = await NetworkManager.publicFetch('/api/founder');
                updateUI(data);
            } catch (err) {
                updateUI({}); 
            }
        };

        const setupEvents = () => {
            const founderBtn = document.getElementById('openFounderBtnFooter');
            const modal = document.getElementById('founderModal');
            const closeBtn = document.querySelector('.close-founder');
            if(founderBtn && modal) {
                founderBtn.onclick = (e) => {
                    e.preventDefault();
                    modal.classList.add('active');
                };
            }
            if(closeBtn && modal) closeBtn.onclick = () => modal.classList.remove('active');
        };

        return { init: () => { fetchFounderData(); setupEvents(); } };
    })();
    // 2. تعديل دالة الـ init الرئيسية عشان تنادي عليه
    return {
        init: () => {
            UIController.cacheDOM();
            TranslationEngine.init();
            SettingsManager.init();
            AnimationManager.init();
            DailyCreditManager.init();
            PresetLibraryEngine.init();
            MusicalCompatibilityEngine.init();
            UIEnhancementManager.init();
            ProjectSessionManager.init();
            DurationManager.init();
            OrchestrationManager.init();
            FormManager.loadSavedData();
            EventBinder.init();
            AnimationManager.startPulse();
            OnboardingManager.init();
            MaestroAssistantManager.init();
            if (typeof MusicLibraryManager !== 'undefined') MusicLibraryManager.init();
            
            // نداء لموديول المؤسس هنا
            FounderManager.init(); 
        }
    };

})(); // قفلة الـ App

document.addEventListener("DOMContentLoaded", () => {
    App.init(); 
});