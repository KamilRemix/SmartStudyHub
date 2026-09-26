document.addEventListener('DOMContentLoaded', () => {
    // Localization resources for dynamic values
    const gpLang = {
        en: {
            danger: 'Danger', weak: 'Weak', medium: 'Medium', good: 'Good', excellent: 'Excellent', unbreakable: 'Unbreakable',
            lessThanSec: 'less than a second', seconds: 'seconds', minutes: 'minutes', hours: 'hours', days: 'days', years: 'years', thousandYears: 'thousand years',
            checkLength: 'Length at least 12 characters', checkUpperLower: 'Uppercase and lowercase letters', checkNumSym: 'Digits and symbols', checkPatterns: 'No simple patterns', checkPwned: 'Not compromised', checkPwnedBad: 'Compromised (found in leaks)',
            leakWarning: 'This password was found in leaked databases {count} times! Do not use it.',
            show: 'Show', hide: 'Hide', copy: 'Copy', delete: 'Delete',
            localOnly: 'Saved locally (Sign in via Google/GitHub to sync)',
            syncSuccess: 'Synced with {provider}',
            deleteTitle: 'Delete password?',
            deleteConfirm: 'Are you sure you want to delete password for "{label}"?',
            crackTime: 'Crack time: {time}',
            addSuccess: 'Password added successfully!',
            fillAll: 'Please fill in all fields',
            copied: 'Copied!',
            pwnedShort: 'Compromised'
        },
        ru: {
            danger: 'Опасно', weak: 'Слабый', medium: 'Средний', good: 'Хороший', excellent: 'Отличный', unbreakable: 'Несокрушимый',
            lessThanSec: 'менее секунды', seconds: 'секунд', minutes: 'минут', hours: 'часов', days: 'дней', years: 'лет', thousandYears: 'тысяч лет',
            checkLength: 'Длина минимум 12 символов', checkUpperLower: 'Заглавные и строчные буквы', checkNumSym: 'Цифры и спецсимволы', checkPatterns: 'Нет простых паттернов', checkPwned: 'Не скомпрометирован', checkPwnedBad: 'Компрометирован (найден в утечках)',
            leakWarning: 'Этот пароль найден в слитых базах данных {count} раз! Не используйте его.',
            show: 'Показать', hide: 'Скрыть', copy: 'Копировать', delete: 'Удалить',
            localOnly: 'Сохранено локально (Войдите через Google/GitHub)',
            syncSuccess: 'Синхронизировано с {provider}',
            deleteTitle: 'Удалить пароль?',
            deleteConfirm: 'Вы уверены, что хотите удалить сохраненный пароль для "{label}"?',
            crackTime: 'Время на взлом: {time}',
            addSuccess: 'Пароль успешно добавлен!',
            fillAll: 'Пожалуйста, заполните все поля',
            copied: 'Скопировано!',
            pwnedShort: 'Компрометирован'
        },
        uk: {
            danger: 'Небезпечно', weak: 'Слабкий', medium: 'Середній', good: 'Хороший', excellent: 'Відмінний', unbreakable: 'Незламний',
            lessThanSec: 'менше секунди', seconds: 'секунд', minutes: 'хвилин', hours: 'годин', days: 'днів', years: 'років', thousandYears: 'тисяч років',
            checkLength: 'Довжина мінімум 12 символів', checkUpperLower: 'Великі та малі літери', checkNumSym: 'Цифри та спецсимволи', checkPatterns: 'Немає простих патернів', checkPwned: 'Не скомпрометований', checkPwnedBad: 'Скомпрометований (знайдений у витоках)',
            leakWarning: 'Цей пароль знайдено в злитих базах даних {count} разів! Не використовуйте його.',
            show: 'Показати', hide: 'Приховати', copy: 'Копіювати', delete: 'Видалити',
            localOnly: 'Збережено локально (Увійдіть через Google/GitHub)',
            syncSuccess: 'Синхронізовано з {provider}',
            deleteTitle: 'Видалити пароль?',
            deleteConfirm: 'Ви впевнені, що хочете видалити збережений пароль для "{label}"?',
            crackTime: 'Час на злам: {time}',
            addSuccess: 'Пароль успішно додано!',
            fillAll: 'Будь ласка, заповніть усі поля',
            copied: 'Скопійовано!',
            pwnedShort: 'Скомпрометований'
        },
        be: {
            danger: 'Небяспечна', weak: 'Слабы', medium: 'Сярэдні', good: 'Добры', excellent: 'Выдатны', unbreakable: 'Нязломны',
            lessThanSec: 'менш за секунду', seconds: 'секунд', minutes: 'хвілін', hours: 'гадзін', days: 'дзён', years: 'гадоў', thousandYears: 'тысяч гадоў',
            checkLength: 'Даўжыня мінімум 12 сімвалаў', checkUpperLower: 'Вялікія і малыя літары', checkNumSym: 'Лічбы і спецсімвалы', checkPatterns: 'Няма простых патэрнаў', checkPwned: 'Не скампраметаваны', checkPwnedBad: 'Скампраметаваны (знойдзены ў выцеках)',
            leakWarning: 'Гэты пароль знойдзены ў злітых базах даных {count} разоў! Не выкарыстоўвайце яго.',
            show: 'Паказаць', hide: 'Схаваць', copy: 'Капіяваць', delete: 'Выдаліць',
            localOnly: 'Захавана лакальна (Увайдзіце праз Google/GitHub)',
            syncSuccess: 'Сінхранізавана з {provider}',
            deleteTitle: 'Выдаліць пароль?',
            deleteConfirm: 'Вы ўпэўнены, што хочаце выдаліць захаваны пароль для "{label}"?',
            crackTime: 'Час на ўзлом: {time}',
            addSuccess: 'Пароль паспяхова дададзены!',
            fillAll: 'Калі ласка, запоўніце ўсе палі',
            copied: 'Скапіявана!',
            pwnedShort: 'Скампраметаваны'
        },
        kk: {
            danger: 'Қауіпті', weak: 'Әлсіз', medium: 'Орташа', good: 'Жақсы', excellent: 'Өте жақсы', unbreakable: 'Бұзылмайтын',
            lessThanSec: 'секундтан аз', seconds: 'секунд', minutes: 'минут', hours: 'сағат', days: 'күн', years: 'жыл', thousandYears: 'мың жыл',
            checkLength: 'Ұзындығы кемінде 12 таңба', checkUpperLower: 'Бас және кіші әріптер', checkNumSym: 'Сандар мен арнайы таңбалар', checkPatterns: 'Қарапайым үлгілер жоқ', checkPwned: 'Бұзылмаған', checkPwnedBad: 'Бұзылған (жылыстауларда табылды)',
            leakWarning: 'Бұл құпия сөз табылған жылыстау деректер базасында {count} рет! Қолданбаңыз.',
            show: 'Көрсету', hide: 'Жасыру', copy: 'Көшіру', delete: 'Жою',
            localOnly: 'Жергілікті сақталған (Google/GitHub арқылы кіріңіз)',
            syncSuccess: '{provider} желісімен синхрондалды',
            deleteTitle: 'Құпия сөзді жою?',
            deleteConfirm: '"{label}" үшін құпия сөзді жоюға сенімдісіз бе?',
            crackTime: 'Бұзу уақыты: {time}',
            addSuccess: 'Құпия сөз сәтті қосылды!',
            fillAll: 'Барлық өрістерді толтырыңыз',
            copied: 'Көшірілді!',
            pwnedShort: 'Бұзылған'
        },
        es: {
            danger: 'Peligro', weak: 'Débil', medium: 'Medio', good: 'Bueno', excellent: 'Excelente', unbreakable: 'Inquebrantable',
            lessThanSec: 'menos de un segundo', seconds: 'segundos', minutes: 'minutos', hours: 'horas', days: 'días', years: 'años', thousandYears: 'miles de años',
            checkLength: 'Longitud mínima de 12 caracteres', checkUpperLower: 'Mayúsculas y minúsculas', checkNumSym: 'Dígitos y símbolos', checkPatterns: 'Sin patrones simples', checkPwned: 'No comprometido', checkPwnedBad: 'Comprometido (encontrado en filtraciones)',
            leakWarning: '¡Esta contraseña se encontró en bases de datos filtradas {count} veces! No la use.',
            show: 'Mostrar', hide: 'Ocultar', copy: 'Copiar', delete: 'Eliminar',
            localOnly: 'Guardado localmente (Inicie sesión con Google/GitHub)',
            syncSuccess: 'Sincronizado con {provider}',
            deleteTitle: '¿Eliminar contraseña?',
            deleteConfirm: '¿Está seguro de que desea eliminar la contraseña de "{label}"?',
            crackTime: 'Tiempo para descifrar: {time}',
            addSuccess: '¡Contraseña agregada con éxito!',
            fillAll: 'Por favor, complete todos los campos',
            copied: '¡Copiado!',
            pwnedShort: 'Comprometido'
        },
        de: {
            danger: 'Gefährlich', weak: 'Schwach', medium: 'Mittel', good: 'Gut', excellent: 'Hervorragend', unbreakable: 'Unknackbar',
            lessThanSec: 'weniger als eine Sekunde', seconds: 'Sekunden', minutes: 'Minuten', hours: 'Stunden', days: 'Tage', years: 'Jahre', thousandYears: 'Jahrtausende',
            checkLength: 'Länge mindestens 12 Zeichen', checkUpperLower: 'Groß- und Kleinschreibung', checkNumSym: 'Zahlen und Sonderzeichen', checkPatterns: 'Keine einfachen Muster', checkPwned: 'Sicher (nicht kompromittiert)', checkPwnedBad: 'Kompromittiert (in Leaks gefunden)',
            leakWarning: 'Dieses Passwort wurde {count}-mal in Datenlecks gefunden! Nicht verwenden.',
            show: 'Anzeigen', hide: 'Ausblenden', copy: 'Kopieren', delete: 'Löschen',
            localOnly: 'Lokal gespeichert (Mit Google/GitHub anmelden)',
            syncSuccess: 'Synchronisiert mit {provider}',
            deleteTitle: 'Passwort löschen?',
            deleteConfirm: 'Sind Sie sicher, dass Sie das Passwort für "{label}" löschen möchten?',
            crackTime: 'Zeit zum Knacken: {time}',
            addSuccess: 'Passwort erfolgreich hinzugefügt!',
            fillAll: 'Bitte füllen Sie alle Felder aus',
            copied: 'Kopiert!',
            pwnedShort: 'Kompromittiert'
        },
        fr: {
            danger: 'Danger', weak: 'Faible', medium: 'Moyen', good: 'Bon', excellent: 'Excellent', unbreakable: 'Incassable',
            lessThanSec: 'moins d\'une seconde', seconds: 'secondes', minutes: 'minutes', hours: 'heures', days: 'jours', years: 'ans', thousandYears: 'milliers d\'années',
            checkLength: 'Longueur d\'au moins 12 caractères', checkUpperLower: 'Majuscules et minuscules', checkNumSym: 'Chiffres et symboles', checkPatterns: 'Pas de motifs simples', checkPwned: 'Non compromis', checkPwnedBad: 'Compromis (trouvé dans des fuites)',
            leakWarning: 'Ce mot de passe a été trouvé dans des fuites {count} fois ! Ne l\'utilisez pas.',
            show: 'Afficher', hide: 'Masquer', copy: 'Copier', delete: 'Supprimer',
            localOnly: 'Enregistré localement (Connectez-vous via Google/GitHub)',
            syncSuccess: 'Synchronisé avec {provider}',
            deleteTitle: 'Supprimer le mot de passe ?',
            deleteConfirm: 'Êtes-vous sûr de vouloir supprimer le mot de passe pour "{label}" ?',
            crackTime: 'Temps de craquage : {time}',
            addSuccess: 'Mot de passe ajouté avec succès !',
            fillAll: 'Veuillez remplir tous les champs',
            copied: 'Copié !',
            pwnedShort: 'Compromis'
        },
        tr: {
            danger: 'Tehlikeli', weak: 'Zayıf', medium: 'Orta', good: 'İyi', excellent: 'Harika', unbreakable: 'Kırılamaz',
            lessThanSec: 'bir saniyeden az', seconds: 'saniye', minutes: 'dakika', hours: 'saat', days: 'gün', years: 'yıl', thousandYears: 'bin yıl',
            checkLength: 'En az 12 karakter uzunluğunda', checkUpperLower: 'Büyük ve küçük harfler', checkNumSym: 'Rakamlar ve semboller', checkPatterns: 'Basit desenler yok', checkPwned: 'Sızdırılmamış', checkPwnedBad: 'Sızdırılmış (veritabanlarında bulundu)',
            leakWarning: 'Bu şifre sızdırılmış veritabanlarında {count} kez bulundu! Kullanmayın.',
            show: 'Göster', hide: 'Gizle', copy: 'Kopyala', delete: 'Sil',
            localOnly: 'Yerel olarak kaydedildi (Eşitlemek için Google/GitHub ile giriş yapın)',
            syncSuccess: '{provider} ile eşitlendi',
            deleteTitle: 'Şifre silinsin mi?',
            deleteConfirm: '"{label}" için şifreyi silmek istediğinizden emin misiniz?',
            crackTime: 'Kırma süresi: {time}',
            addSuccess: 'Şifre başarıyla eklendi!',
            fillAll: 'Lütfen tüm alanları doldurun',
            copied: 'Kopyalandı!',
            pwnedShort: 'Sızdırılmış'
        },
        zh: {
            danger: '危险', weak: '弱', medium: '中等', good: '良好', excellent: '优秀', unbreakable: '坚不可摧',
            lessThanSec: '不到一秒', seconds: '秒', minutes: '分钟', hours: '小时', days: '天', years: '年', thousandYears: '千年',
            checkLength: '长度至少 12 个字符', checkUpperLower: '大小写字母', checkNumSym: '数字和符号', checkPatterns: '无简单模式', checkPwned: '未泄露', checkPwnedBad: '已泄露（在泄露库中找到）',
            leakWarning: '此密码在已泄露的数据库中被发现 {count} 次！请勿使用。',
            show: '显示', hide: '隐藏', copy: '复制', delete: '删除',
            localOnly: '已保存在本地（登录 Google/GitHub 进行同步）',
            syncSuccess: '已与 {provider} 同步',
            deleteTitle: '删除密码？',
            deleteConfirm: '您确定要删除 "{label}" 的密码吗？',
            crackTime: '破解时间：{time}',
            addSuccess: '密码添加成功！',
            fillAll: '请填写所有字段',
            copied: '已复制！',
            pwnedShort: '已泄露'
        },
        ar: {
            danger: 'خطر', weak: 'ضعيف', medium: 'متوسط', good: 'جيد', excellent: 'ممتاز', unbreakable: 'لا يمكن كسرها',
            lessThanSec: 'أقل من ثانية', seconds: 'ثواني', minutes: 'دقائق', hours: 'ساعات', days: 'أيام', years: 'سنوات', thousandYears: 'آلاف السنين',
            checkLength: 'الطول لا يقل عن 12 رمزاً', checkUpperLower: 'حروف كبيرة وصغيرة', checkNumSym: 'أرقام ورموز خاصة', checkPatterns: 'لا توجد أنماط بسيطة', checkPwned: 'غير مخترق', checkPwnedBad: 'مخترق (تم العثور عليه في التسريبات)',
            leakWarning: 'تم العثور على كلمة المرور هذه في قواعد البيانات المسربة {count} مرة! لا تستخدمها.',
            show: 'عرض', hide: 'إخفاء', copy: 'نسخ', delete: 'حذف',
            localOnly: 'محفوظ محلياً (سجّل الدخول عبر Google/GitHub للمزامنة)',
            syncSuccess: 'تمت المزامنة مع {provider}',
            deleteTitle: 'حذف كلمة المرور؟',
            deleteConfirm: 'هل أنت متأكد من حذف كلمة المرور الخاصة بـ "{label}"؟',
            crackTime: 'الوقت اللازم للاختراق: {time}',
            addSuccess: 'تم إضافة كلمة المرور بنجاح!',
            fillAll: 'يرجى ملء جميع الحقول',
            copied: 'تم النسخ!',
            pwnedShort: 'مخترق'
        }
    };

    function t(key, replacements = {}) {
        const lang = window.currentLang || 'ru';
        const trans = gpLang[lang] || gpLang.en;
        let text = trans[key] || gpLang.en[key] || key;
        
        Object.keys(replacements).forEach(k => {
            text = text.replace(new RegExp(`\\{${k}\\}`, 'gi'), replacements[k]);
        });
        return text;
    }

    // Tab switching
    const tabs = document.querySelectorAll('.genpass-tab');
    const contents = document.querySelectorAll('.genpass-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => {
                c.classList.remove('active');
                c.classList.add('hidden');
                c.style.display = 'none';
            });
            
            tab.classList.add('active');
            const target = document.getElementById(tab.dataset.target);
            if (target) {
                target.classList.remove('hidden');
                target.classList.add('active');
                target.style.display = 'block';
            }
        });
    });

    // Generator elements
    const lengthInput = document.getElementById('genpass-length');
    const lengthVal = document.getElementById('genpass-length-val');
    const upperInput = document.getElementById('genpass-upper');
    const lowerInput = document.getElementById('genpass-lower');
    const numbersInput = document.getElementById('genpass-numbers');
    const symbolsInput = document.getElementById('genpass-symbols');
    const generateBtn = document.getElementById('genpass-generate-btn');
    const output = document.getElementById('genpass-output');
    const copyBtn = document.getElementById('genpass-copy-btn');
    const saveGeneratedBtn = document.getElementById('genpass-save-generated');

    // Analyzer elements
    const analyzeInput = document.getElementById('genpass-analyze-input');
    const toggleVisBtn = document.getElementById('genpass-toggle-vis');
    const clearInputBtn = document.getElementById('genpass-clear-input');
    const saveAnalyzedBtn = document.getElementById('genpass-save-analyzed');
    const scoreVal = document.getElementById('genpass-score');
    const statusVal = document.getElementById('genpass-status');
    const crackTimeVal = document.getElementById('genpass-crack-time');
    const leakWarning = document.getElementById('genpass-leak-warning');
    const leakWarningText = document.getElementById('genpass-leak-warning-text');
    const improveBtn = document.getElementById('genpass-improve-btn');
    const scoreRing = document.querySelector('.score-ring');

    const checkLength = document.getElementById('check-length');
    const checkUpperLower = document.getElementById('check-upperlower');
    const checkNumSym = document.getElementById('check-numsym');
    const checkPatterns = document.getElementById('check-patterns');
    const checkPwned = document.getElementById('check-pwned');

    // Saved Passwords & Tooltip elements
    const syncIcon = document.getElementById('genpass-sync-icon');
    const tooltipEl = document.getElementById('genpass-tooltip');

    // Manual Add Form elements
    const addBtn = document.getElementById('genpass-add-btn');
    const addForm = document.getElementById('genpass-add-form');
    const addClose = document.getElementById('genpass-add-close');
    const addLabel = document.getElementById('genpass-add-label');
    const addPassword = document.getElementById('genpass-add-password');
    const addToggleVis = document.getElementById('genpass-add-toggle-vis');
    const addGenBtn = document.getElementById('genpass-add-gen-btn');
    const addSaveBtn = document.getElementById('genpass-add-save-btn');

    // Character sets
    const chars = {
        upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        lower: 'abcdefghijklmnopqrstuvwxyz',
        numbers: '0123456789',
        symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
    };

    let savedPasswords = [];

    function getActiveUser() {
        return (window.getCurrentUser ? window.getCurrentUser() : null) || (window.firebase?.auth?.()?.currentUser ?? null);
    }

    // Determine auth provider for display text
    function getAuthProviderName() {
        const user = getActiveUser();
        if (!user) return null;
        const providerData = user.providerData || [];
        if (providerData.some(p => p.providerId === 'github.com' || p.providerId === 'github')) {
            return 'GitHub';
        }
        if (providerData.some(p => p.providerId === 'google.com' || p.providerId === 'google')) {
            return 'Google';
        }
        return 'Google'; // Default cloud provider
    }

    // Sync status helper
    function updateSyncStatus(statusText, isSynced = false) {
        const syncStatusEl = document.getElementById('genpass-sync-status');
        if (!syncStatusEl) return;
        
        const provider = getAuthProviderName();
        if (isSynced && provider) {
            syncStatusEl.textContent = t('syncSuccess', { provider });
            syncStatusEl.style.color = '#4caf50';
        } else if (isSynced) {
            syncStatusEl.textContent = statusText;
            syncStatusEl.style.color = '#4caf50';
        } else {
            syncStatusEl.textContent = t('localOnly');
            syncStatusEl.style.color = 'var(--text-color-secondary)';
        }
    }

    // Load from LocalStorage & Firebase
    async function loadPasswordsList() {
        try {
            const localData = localStorage.getItem('genpass_saved');
            if (localData) {
                savedPasswords = JSON.parse(localData);
            }
        } catch (e) {
            console.error('Failed to load local passwords:', e);
        }

        const user = getActiveUser();
        if (user && window.firebase?.database) {
            try {
                const snap = await window.firebase.database().ref(`users/${user.uid}/passwords`).once('value');
                const val = snap.val();
                if (val && Array.isArray(val)) {
                    savedPasswords = val;
                    localStorage.setItem('genpass_saved', JSON.stringify(savedPasswords));
                    updateSyncStatus('', true);
                } else if (savedPasswords.length > 0) {
                    await window.firebase.database().ref(`users/${user.uid}/passwords`).set(savedPasswords);
                    updateSyncStatus('', true);
                } else {
                    updateSyncStatus('', true);
                }
            } catch (e) {
                console.error('[GenPass] Sync from Firebase failed:', e);
                updateSyncStatus('Error', false);
            }
        } else {
            updateSyncStatus('', false);
        }
        renderSavedList();
    }

    // Save passwords list
    async function savePasswordsList() {
        localStorage.setItem('genpass_saved', JSON.stringify(savedPasswords));
        const user = getActiveUser();
        if (user && window.firebase?.database) {
            try {
                await window.firebase.database().ref(`users/${user.uid}/passwords`).set(savedPasswords);
                updateSyncStatus('', true);
            } catch (e) {
                console.error('[GenPass] Sync to Firebase failed:', e);
                updateSyncStatus('Error', false);
            }
        } else {
            updateSyncStatus('', false);
        }
        renderSavedList();
    }

    // Save Password Prompt
    async function promptSavePassword(password) {
        if (!password) return;
        
        const placeholderText = t('genpassAddLabelPlaceholder');
        const titleText = t('deleteTitle'); // Or we can use generic save dialog
        const msgText = window.currentLang === 'en' ? 'Enter service name for this password:' : 'Введите название сервиса для этого пароля:';
        
        let label = '';
        if (typeof openAppDialog !== 'undefined') {
            label = await openAppDialog({
                title: window.currentLang === 'en' ? 'Save Password' : 'Сохранить пароль',
                message: msgText,
                showInput: true,
                placeholder: placeholderText,
                acceptLabel: window.currentLang === 'en' ? 'Save' : 'Сохранить',
                cancelLabel: window.currentLang === 'en' ? 'Cancel' : 'Отмена',
                showCancel: true
            });
        } else {
            label = prompt(msgText);
        }

        if (label && typeof label === 'string' && label.trim()) {
            const newItem = {
                id: Date.now().toString(),
                label: label.trim(),
                password: password,
                createdAt: Date.now()
            };
            savedPasswords.unshift(newItem);
            await savePasswordsList();
            
            if (typeof showToast !== 'undefined') {
                showToast(t('addSuccess'), 'success');
            }
        }
    }

    // Quick local strength evaluator for tooltip
    function evaluatePasswordQuick(pwd) {
        const len = pwd ? pwd.length : 0;
        const hasUpper = /[A-Z]/.test(pwd);
        const hasLower = /[a-z]/.test(pwd);
        const hasNum = /[0-9]/.test(pwd);
        const hasSym = /[^A-Za-z0-9]/.test(pwd);

        let poolSize = 0;
        if (hasLower) poolSize += 26;
        if (hasUpper) poolSize += 26;
        if (hasNum) poolSize += 10;
        if (hasSym) poolSize += 32;

        let lenScore = 0;
        if (len < 5) lenScore = 0;
        else if (len <= 7) lenScore = 15;
        else if (len <= 11) lenScore = 30;
        else lenScore = 40;

        let score = lenScore;
        if (hasUpper && hasLower) score += 15;
        if (hasNum) score += 15;
        if (hasSym) score += 15;
        if (/(qwerty|12345|asdfgh|password)/i.test(pwd)) score -= 25;
        if (len >= 16) score += 15;

        score = Math.max(0, Math.min(100, score));

        const combinations = Math.pow(poolSize, len);
        const seconds = combinations / 100000000000;
        
        let timeStr = '';
        if (seconds < 1) timeStr = t('lessThanSec');
        else if (seconds < 60) timeStr = `~${Math.round(seconds)} ${t('seconds')}`;
        else if (seconds < 3600) timeStr = `~${Math.round(seconds / 60)} ${t('minutes')}`;
        else if (seconds < 86400) timeStr = `~${Math.round(seconds / 3600)} ${t('hours')}`;
        else if (seconds < 31536000) timeStr = `~${Math.round(seconds / 86400)} ${t('days')}`;
        else if (seconds < 3153600000) timeStr = `~${Math.round(seconds / 31536000)} ${t('years')}`;
        else timeStr = `~${Math.round(seconds / 31536000 / 1000)} ${t('thousandYears')}`;

        let statusText = '';
        let badgeColor = '#4caf50';
        let descText = '';

        if (score < 30) {
            statusText = t('danger');
            badgeColor = '#ff4c4c';
            descText = window.currentLang === 'en' ? 'Very short or simple password. Easy to brute-force.' : 'Очень короткий или простой пароль. Легко взломать перебором.';
        } else if (score < 55) {
            statusText = t('weak');
            badgeColor = '#ff9800';
            descText = window.currentLang === 'en' ? 'Recommendation: add special symbols and increase length.' : 'Рекомендуется добавить спецсимволы и увеличить длину.';
        } else if (score < 80) {
            statusText = t('good');
            badgeColor = '#ffeb3b';
            descText = window.currentLang === 'en' ? 'Good resistance to brute-force attacks.' : 'Хорошая устойчивость к перебору.';
        } else {
            statusText = t('unbreakable');
            badgeColor = '#00e676';
            descText = window.currentLang === 'en' ? 'Maximum security! High entropy and excellent length.' : 'Максимальная защита! Высокая энтропия и отличная длина.';
        }

        return { score, statusText, badgeColor, timeStr, descText };
    }

    // Render Saved Passwords List
    function renderSavedList() {
        const listContainer = document.getElementById('genpass-saved-list');
        if (!listContainer) return;
        
        listContainer.innerHTML = '';
        
        if (savedPasswords.length === 0) {
            const emptyText = window.currentLang === 'en' ? 'No saved passwords yet' : 'Нет сохраненных паролей';
            listContainer.innerHTML = `<div style="text-align: center; color: var(--text-color-secondary); padding: 25px; font-size: 0.9rem;">${emptyText}</div>`;
            return;
        }

        savedPasswords.forEach(item => {
            const evalResult = evaluatePasswordQuick(item.password);
            const row = document.createElement('div');
            row.className = 'saved-password-item glassmorphism';
            row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 10px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); gap: 10px; margin-bottom: 6px; transition: border-color 0.2s;';
            
            row.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                    <div class="strength-hover-badge" style="width: 28px; height: 28px; border-radius: 50%; background: ${evalResult.badgeColor}22; border: 1.5px solid ${evalResult.badgeColor}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: help;" title="${window.currentLang === 'en' ? 'Hover for analysis' : 'Наведите для анализа'}">
                        <span class="material-symbols-outlined" style="font-size: 16px; color: ${evalResult.badgeColor};">shield</span>
                    </div>
                    <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
                        <div style="font-weight: 600; font-size: 0.9rem; color: var(--text-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtmlText(item.label)}</div>
                        <div class="saved-pwd-val" style="font-family: monospace; font-size: 0.9rem; color: var(--primary-accent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 1px;">••••••••</div>
                    </div>
                </div>
                <div style="display: flex; gap: 4px; flex-shrink: 0;">
                    <button class="notes-icon-btn btn-show-pwd" style="padding: 6px; background: none; border: none; cursor: pointer; color: var(--text-color-secondary);" title="${t('show')}"><span class="material-symbols-outlined" style="font-size: 18px;">visibility</span></button>
                    <button class="notes-icon-btn btn-copy-pwd" style="padding: 6px; background: none; border: none; cursor: pointer; color: var(--text-color-secondary);" title="${t('copy')}"><span class="material-symbols-outlined" style="font-size: 18px;">content_copy</span></button>
                    <button class="notes-icon-btn btn-delete-pwd" style="padding: 6px; background: none; border: none; cursor: pointer; color: var(--text-color-secondary);" title="${t('delete')}"><span class="material-symbols-outlined" style="font-size: 18px;">delete</span></button>
                </div>
            `;
            
            const badgeEl = row.querySelector('.strength-hover-badge');
            const pwdVal = row.querySelector('.saved-pwd-val');
            const btnShow = row.querySelector('.btn-show-pwd');
            const btnCopy = row.querySelector('.btn-copy-pwd');
            const btnDelete = row.querySelector('.btn-delete-pwd');
            
            let shown = false;

            // Hover Tooltip Events
            if (badgeEl && tooltipEl) {
                badgeEl.addEventListener('mouseenter', (e) => {
                    tooltipEl.innerHTML = `
                        <div class="genpass-tooltip-title" style="color: ${evalResult.badgeColor};">
                            <span class="material-symbols-outlined" style="font-size: 16px;">shield</span>
                            ${evalResult.statusText} (${evalResult.score}%)
                        </div>
                        <div style="font-size: 0.78rem; margin-bottom: 4px; color: var(--text-color);">${t('crackTime', { time: evalResult.timeStr })}</div>
                        <div class="genpass-tooltip-desc">${evalResult.descText}</div>
                    `;
                    tooltipEl.classList.add('show');
                    positionTooltip(e);
                });

                badgeEl.addEventListener('mousemove', (e) => {
                    positionTooltip(e);
                });

                badgeEl.addEventListener('mouseleave', () => {
                    tooltipEl.classList.remove('show');
                });
            }

            btnShow.addEventListener('click', () => {
                shown = !shown;
                pwdVal.textContent = shown ? item.password : '••••••••';
                btnShow.querySelector('.material-symbols-outlined').textContent = shown ? 'visibility_off' : 'visibility';
                btnShow.title = shown ? t('hide') : t('show');
            });
            
            btnCopy.addEventListener('click', () => {
                navigator.clipboard.writeText(item.password);
                const icon = btnCopy.querySelector('.material-symbols-outlined');
                icon.textContent = 'check';
                if (typeof showToast !== 'undefined') {
                    showToast(t('copied'), 'success');
                }
                setTimeout(() => icon.textContent = 'content_copy', 1500);
            });
            
            btnDelete.addEventListener('click', async () => {
                let confirmDel = false;
                if (typeof openAppDialog !== 'undefined') {
                    confirmDel = await openAppDialog({
                        title: t('deleteTitle'),
                        message: t('deleteConfirm', { label: item.label }),
                        showCancel: true,
                        acceptLabel: t('delete'),
                        cancelLabel: window.currentLang === 'en' ? 'Cancel' : 'Отмена'
                    });
                } else {
                    confirmDel = confirm(t('deleteConfirm', { label: item.label }));
                }
                
                if (confirmDel) {
                    savedPasswords = savedPasswords.filter(p => p.id !== item.id);
                    await savePasswordsList();
                    if (typeof showToast !== 'undefined') {
                        showToast(window.currentLang === 'en' ? 'Password deleted' : 'Пароль удален', 'info');
                    }
                }
            });
            
            listContainer.appendChild(row);
        });
    }

    function positionTooltip(e) {
        if (!tooltipEl) return;
        const x = e.clientX + 12;
        const y = e.clientY + 12;
        tooltipEl.style.left = `${Math.min(x, window.innerWidth - 270)}px`;
        tooltipEl.style.top = `${Math.min(y, window.innerHeight - 120)}px`;
    }

    function escapeHtmlText(text) {
        if (!text) return '';
        return text.replace(/&/g, "&amp;")
                   .replace(/</g, "&lt;")
                   .replace(/>/g, "&gt;")
                   .replace(/"/g, "&quot;")
                   .replace(/'/g, "&#039;");
    }

    // Manual Add Form trigger event listeners
    if (addBtn && addForm) {
        addBtn.addEventListener('click', () => {
            addForm.classList.remove('hidden');
            addForm.style.display = 'flex';
            addLabel.value = '';
            addPassword.value = '';
            addLabel.focus();
        });
    }

    if (addClose && addForm) {
        addClose.addEventListener('click', () => {
            addForm.classList.add('hidden');
            addForm.style.display = 'none';
        });
    }

    if (addToggleVis && addPassword) {
        addToggleVis.addEventListener('click', () => {
            if (addPassword.type === 'password') {
                addPassword.type = 'text';
                addToggleVis.textContent = 'visibility_off';
            } else {
                addPassword.type = 'password';
                addToggleVis.textContent = 'visibility';
            }
        });
    }

    if (addGenBtn && addPassword) {
        addGenBtn.addEventListener('click', () => {
            // Generate a secure 16-character password
            const charset = chars.upper + chars.lower + chars.numbers + chars.symbols;
            let pwd = '';
            for (let i = 0; i < 16; i++) {
                pwd += charset[Math.floor(Math.random() * charset.length)];
            }
            addPassword.value = pwd;
            addPassword.type = 'text';
            addToggleVis.textContent = 'visibility_off';
        });
    }

    if (addSaveBtn) {
        addSaveBtn.addEventListener('click', async () => {
            const label = addLabel.value.trim();
            const password = addPassword.value.trim();
            
            if (!label || !password) {
                if (typeof showToast !== 'undefined') {
                    showToast(t('fillAll'), 'error');
                }
                return;
            }
            
            const newItem = {
                id: Date.now().toString(),
                label: label,
                password: password,
                createdAt: Date.now()
            };
            savedPasswords.unshift(newItem);
            await savePasswordsList();
            
            addForm.classList.add('hidden');
            addForm.style.display = 'none';
            
            if (typeof showToast !== 'undefined') {
                showToast(t('addSuccess'), 'success');
            }
        });
    }

    // Sync trigger
    if (syncIcon) {
        syncIcon.addEventListener('click', () => {
            loadPasswordsList();
        });
    }

    // Monitor auth changes
    if (window.firebase?.auth) {
        window.firebase.auth().onAuthStateChanged(() => {
            loadPasswordsList();
        });
    }

    // Initial load
    loadPasswordsList();

    // Generator logic
    function generatePassword(length = null) {
        const len = length || parseInt(lengthInput.value);
        let charset = '';
        if (upperInput.checked) charset += chars.upper;
        if (lowerInput.checked) charset += chars.lower;
        if (numbersInput.checked) charset += chars.numbers;
        if (symbolsInput.checked) charset += chars.symbols;

        if (charset === '') {
            charset = chars.lower + chars.numbers;
            lowerInput.checked = true;
            numbersInput.checked = true;
        }

        let password = '';
        for (let i = 0; i < len; i++) {
            password += charset[Math.floor(Math.random() * charset.length)];
        }
        output.value = password;
    }

    // Generator events
    lengthInput.addEventListener('input', (e) => {
        lengthVal.textContent = e.target.value;
        generatePassword();
    });

    [upperInput, lowerInput, numbersInput, symbolsInput].forEach(input => {
        input.addEventListener('change', () => generatePassword());
    });

    generateBtn.addEventListener('click', () => generatePassword());

    copyBtn.addEventListener('click', () => {
        if (!output.value) return;
        navigator.clipboard.writeText(output.value);
        const icon = copyBtn.querySelector('.material-symbols-outlined');
        icon.textContent = 'check';
        if (typeof showToast !== 'undefined') {
            showToast(t('copied'), 'success');
        }
        setTimeout(() => icon.textContent = 'content_copy', 2000);
    });

    saveGeneratedBtn.addEventListener('click', () => {
        promptSavePassword(output.value);
    });

    // Generate initial password
    generatePassword();

    // Analyzer logic
    toggleVisBtn.addEventListener('click', () => {
        if (analyzeInput.type === 'password') {
            analyzeInput.type = 'text';
            toggleVisBtn.querySelector('.material-symbols-outlined').textContent = 'visibility_off';
        } else {
            analyzeInput.type = 'password';
            toggleVisBtn.querySelector('.material-symbols-outlined').textContent = 'visibility';
        }
    });

    clearInputBtn.addEventListener('click', () => {
        analyzeInput.value = '';
        analyzeInput.dispatchEvent(new Event('input'));
    });

    saveAnalyzedBtn.addEventListener('click', () => {
        promptSavePassword(analyzeInput.value);
    });

    // In-place Improve Password logic
    function improvePassword(pw) {
        if (!pw) {
            const charset = chars.upper + chars.lower + chars.numbers + chars.symbols;
            let res = '';
            for (let i = 0; i < 16; i++) {
                res += charset[Math.floor(Math.random() * charset.length)];
            }
            return res;
        }
        
        let res = pw;
        
        // Capitalize first letter
        if (res.length > 0 && /[a-z]/.test(res[0])) {
            res = res[0].toUpperCase() + res.slice(1);
        }
        
        // L33t substitutions
        const substitutions = {
            'a': '@', 'A': '@',
            's': '$', 'S': '$',
            'i': '1', 'I': '1',
            'o': '0', 'O': '0',
            'e': '3', 'E': '3',
            't': '7', 'T': '7'
        };
        
        let substituted = '';
        for (let char of res) {
            if (substitutions[char] && Math.random() > 0.4) {
                substituted += substitutions[char];
            } else {
                substituted += char;
            }
        }
        res = substituted;
        
        // Ensure character types
        if (!/[A-Z]/.test(res)) res += 'K';
        if (!/[a-z]/.test(res)) res += 'm';
        if (!/[0-9]/.test(res)) res += Math.floor(Math.random() * 10);
        if (!/[^A-Za-z0-9]/.test(res)) res += '!';
        
        // Pad to 16 characters
        const extraSymbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        const extraNumbers = '0123456789';
        while (res.length < 16) {
            if (Math.random() > 0.5) {
                res += extraSymbols[Math.floor(Math.random() * extraSymbols.length)];
            } else {
                res += extraNumbers[Math.floor(Math.random() * extraNumbers.length)];
            }
        }
        
        return res;
    }

    improveBtn.addEventListener('click', () => {
        const currentVal = analyzeInput.value;
        const improved = improvePassword(currentVal);
        analyzeInput.value = improved;
        analyzeInput.type = 'text';
        toggleVisBtn.querySelector('.material-symbols-outlined').textContent = 'visibility_off';
        
        analyzeInput.dispatchEvent(new Event('input'));
        
        if (typeof showToast !== 'undefined') {
            showToast(window.currentLang === 'en' ? 'Password improved in-place!' : 'Пароль автоматически улучшен до безопасного!', 'success');
        }
    });

    let analyzeTimeout;
    analyzeInput.addEventListener('input', (e) => {
        const password = e.target.value;
        clearTimeout(analyzeTimeout);
        
        if (!password) {
            resetAnalyzer();
            return;
        }

        analyzeTimeout = setTimeout(() => {
            analyzePassword(password);
        }, 300);
    });

    function resetAnalyzer() {
        scoreVal.textContent = '0%';
        scoreRing.style.borderColor = '#444';
        statusVal.textContent = t('genpassWaiting');
        statusVal.style.color = 'var(--text-color)';
        crackTimeVal.textContent = t('crackTime', { time: '-' });
        leakWarning.style.display = 'none';
        improveBtn.style.display = 'none';
        
        setCheck(checkLength, false, t('checkLength'));
        setCheck(checkUpperLower, false, t('checkUpperLower'));
        setCheck(checkNumSym, false, t('checkNumSym'));
        setCheck(checkPatterns, true, t('checkPatterns'));
        setCheck(checkPwned, true, t('checkPwned'));
    }

    function setCheck(element, isOk, text) {
        const icon = element.querySelector('.material-symbols-outlined');
        if (isOk) {
            icon.textContent = 'check_circle';
            icon.style.color = '#4caf50';
            element.style.color = 'var(--text-color)';
        } else {
            icon.textContent = 'cancel';
            icon.style.color = '#ff4c4c';
            element.style.color = 'var(--text-color-secondary)';
        }
        element.innerHTML = '';
        element.appendChild(icon);
        element.appendChild(document.createTextNode(' ' + text));
    }

    async function analyzePassword(password) {
        let poolSize = 0;
        
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNum = /[0-9]/.test(password);
        const hasSym = /[^A-Za-z0-9]/.test(password);

        if (hasLower) poolSize += 26;
        if (hasUpper) poolSize += 26;
        if (hasNum) poolSize += 10;
        if (hasSym) poolSize += 32;

        const len = password.length;
        
        // Checklist updates
        setCheck(checkLength, len >= 12, t('checkLength'));
        setCheck(checkUpperLower, hasUpper && hasLower, t('checkUpperLower'));
        setCheck(checkNumSym, hasNum && hasSym, t('checkNumSym'));

        // Pattern check
        const hasPattern = /(qwerty|12345|asdfgh|password|111|aaa)/i.test(password);
        setCheck(checkPatterns, !hasPattern, t('checkPatterns'));

        // Length evaluation rules: < 5 (critical), 5-7 (weak), 8-11 (good), 12+ (excellent)
        let lenScore = 0;
        if (len < 5) lenScore = 0;
        else if (len <= 7) lenScore = 15;
        else if (len <= 11) lenScore = 30;
        else lenScore = 40;

        let score = lenScore;
        if (hasUpper && hasLower) score += 15;
        if (hasNum) score += 15;
        if (hasSym) score += 15;
        if (hasPattern) score -= 25;
        if (len >= 16) score += 15;

        score = Math.max(0, Math.min(100, score));

        // Pwned Passwords API (Real SHA-1 k-Anonymity query)
        let isPwned = false;
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-1', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
            
            const prefix = hashHex.slice(0, 5);
            const suffix = hashHex.slice(5);

            const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
            const text = await res.text();
            
            const lines = text.split('\n');
            const found = lines.find(line => line.startsWith(suffix));
            
            if (found) {
                isPwned = true;
                const count = found.split(':')[1].trim();
                if (leakWarningText) {
                    leakWarningText.textContent = t('leakWarning', { count });
                }
                leakWarning.style.display = 'flex';
                setCheck(checkPwned, false, t('checkPwnedBad'));
                score = Math.min(score, 15);
            } else {
                leakWarning.style.display = 'none';
                setCheck(checkPwned, true, t('checkPwned'));
            }
        } catch (err) {
            console.error('Pwned check error:', err);
        }

        // Crack time calculation
        const combinations = Math.pow(poolSize, len);
        const seconds = combinations / 100000000000;
        
        let timeStr = '';
        if (seconds < 1) timeStr = t('lessThanSec');
        else if (seconds < 60) timeStr = `~${Math.round(seconds)} ${t('seconds')}`;
        else if (seconds < 3600) timeStr = `~${Math.round(seconds / 60)} ${t('minutes')}`;
        else if (seconds < 86400) timeStr = `~${Math.round(seconds / 3600)} ${t('hours')}`;
        else if (seconds < 31536000) timeStr = `~${Math.round(seconds / 86400)} ${t('days')}`;
        else if (seconds < 3153600000) timeStr = `~${Math.round(seconds / 31536000)} ${t('years')}`;
        else timeStr = `~${Math.round(seconds / 31536000 / 1000)} ${t('thousandYears')}`;
        
        if (poolSize === 0) timeStr = '-';

        crackTimeVal.textContent = t('crackTime', { time: timeStr });

        // Status thresholds
        let status = '';
        let color = '';
        if (score < 25) { status = t('danger'); color = '#ff4c4c'; }
        else if (score < 45) { status = t('weak'); color = '#ff9800'; }
        else if (score < 70) { status = t('medium'); color = '#ffeb3b'; }
        else if (score < 90) { status = t('excellent'); color = '#4caf50'; }
        else { status = t('unbreakable'); color = '#00e676'; }

        scoreVal.textContent = `${score}%`;
        statusVal.textContent = status;
        statusVal.style.color = color;
        scoreRing.style.borderColor = color;

        if (score < 80) {
            improveBtn.style.display = 'block';
        } else {
            improveBtn.style.display = 'none';
        }
    }

    // Translation listener hook
    window.updateGenPassTranslations = () => {
        renderSavedList();
        // Recalculate analyzer if it has input
        if (analyzeInput.value) {
            analyzePassword(analyzeInput.value);
        } else {
            resetAnalyzer();
        }
        // Update sync status text
        const isSynced = getActiveUser() && window.firebase?.database;
        updateSyncStatus('', isSynced);
    };
});
