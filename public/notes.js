/**
 * SmartStudyHub — Notes Module (Google Keep style)
 * Full-featured: pinning, color picker, search, list/grid view,
 * note modal editor, Firebase sync, AI API, Liquid Glass UI, Reminders & Audio.
 */
(function () {
    'use strict';

    /* =========================================================
       DOM REFS
    ========================================================= */
    const panelNotes        = document.getElementById('tools-notes-panel');
    const tileNotes         = document.getElementById('tile-notes');
    const toolsHub          = document.getElementById('tools-hub');

    // Header
    const searchInput       = document.getElementById('notes-search-input');
    const viewToggleBtn     = document.getElementById('notes-view-toggle');
    const viewIcon          = document.getElementById('notes-view-icon');
    const filterRemindersBtn= document.getElementById('notes-filter-reminders');

    // Creator
    const creator           = document.getElementById('note-creator');
    const creatorCollapsed  = document.getElementById('note-creator-collapsed');
    const creatorExpanded   = document.getElementById('note-creator-expanded');
    const titleInput        = document.getElementById('note-title-input');
    const textInput         = document.getElementById('note-text-input');
    const checklistArea     = document.getElementById('note-checklist-area');
    const btnCloseNote      = document.getElementById('btn-close-note');
    const btnNotePin        = document.getElementById('btn-note-pin');
    const btnNoteColor      = document.getElementById('btn-note-color');
    const noteColorPopup    = document.getElementById('note-color-popup');
    const btnNewNoteCheck   = document.getElementById('btn-new-note-check');
    
    // Creator Image
    const btnNewNoteImg     = document.getElementById('btn-new-note-img');
    const creatorFileInput  = document.getElementById('note-creator-file-input');
    const creatorImgCont    = document.getElementById('note-creator-image-container');
    const creatorImg        = document.getElementById('note-creator-image');
    const creatorImgRemove  = document.getElementById('note-creator-image-remove');

    // Creator Reminder
    const btnNoteReminder   = document.getElementById('btn-note-reminder');

    // Grids
    const pinnedSection     = document.getElementById('notes-pinned-section');
    const pinnedGrid        = document.getElementById('notes-pinned-grid');
    const othersSection     = document.getElementById('notes-others-section');
    const othersLabel       = document.getElementById('notes-others-label');
    const othersGrid        = document.getElementById('notes-grid');
    const emptyState        = document.getElementById('notes-empty-state');

    // Edit Modal
    const editModal         = document.getElementById('note-edit-modal');
    const editBackdrop      = document.getElementById('note-edit-backdrop');
    const editCard          = document.getElementById('note-edit-card');
    const editTitle         = document.getElementById('note-edit-title');
    const editText          = document.getElementById('note-edit-text');
    const editChecklist     = document.getElementById('note-edit-checklist');
    const btnEditClose      = document.getElementById('btn-edit-close');
    const btnEditPin        = document.getElementById('btn-edit-pin');
    const btnEditDelete     = document.getElementById('btn-edit-delete');
    const btnEditColor      = document.getElementById('btn-edit-color');
    const editColorPopup    = document.getElementById('note-edit-color-popup');
    
    // Edit Modal Image
    const editFileInput     = document.getElementById('note-edit-file-input');
    const editImgCont       = document.getElementById('note-edit-image-container');
    const editImg           = document.getElementById('note-edit-image');
    const editImgRemove     = document.getElementById('note-edit-image-remove');
    const btnEditImg        = document.getElementById('btn-edit-img');
    
    // Edit Modal Reminder
    const btnEditReminder   = document.getElementById('btn-edit-reminder');

    // Reminder Popover / Modal
    const reminderModal     = document.getElementById('note-reminder-modal');
    const reminderBackdrop  = document.getElementById('note-reminder-backdrop');
    const reminderDatetime = document.getElementById('note-reminder-datetime');
    const reminderSave     = document.getElementById('note-reminder-save');
    const reminderCancel   = document.getElementById('note-reminder-cancel');
    const reminderClear    = document.getElementById('note-reminder-clear');

    /* =========================================================
       STATE
    ========================================================= */
    let notesData    = {};
    let isGridView   = true;     // true = grid, false = list
    let creatorPinned = false;
    let creatorColor = '';
    let creatorIsChecklist = false;
    let creatorImage = null; // base64
    let creatorReminder = null; // timestamp
    let searchQuery  = '';
    let filterReminders = false;
    let editingId    = null;     // null = create, else = editing existing
    let reminderTargetId = null; // null for creator, id for editor

    /* =========================================================
       FIREBASE
    ========================================================= */
    let notesListenerAttached = false;

    function fbUser() {
        return (window.getCurrentUser ? window.getCurrentUser() : null) || (window.firebase?.auth?.()?.currentUser ?? null);
    }

    /* --- Local Notification helper (only for a single note) --- */
    function getNotificationId(str) {
        let hash = 0;
        if (!str) return 1;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash) % 2147483647 || 1;
    }

    async function scheduleOneLocalNotification(note) {
        const LocalNotifications = window.Capacitor?.Plugins?.LocalNotifications;
        if (!LocalNotifications || !note || !note.reminder) return;
        const now = Date.now();
        if (note.reminder <= now || note.reminderFired) return;
        try {
            if (typeof LocalNotifications.requestPermissions === 'function') {
                const perms = await LocalNotifications.requestPermissions();
                if (perms?.display === 'denied') return;
            }
            await LocalNotifications.schedule({
                notifications: [{
                    id: getNotificationId(note.id),
                    title: note.title || 'SmartStudyHub',
                    body: note.text || (note.checklist ? note.checklist.map(i => i.text).join(', ') : 'Напоминание'),
                    schedule: { at: new Date(note.reminder) },
                    sound: null,
                    attachments: null,
                    actionTypeId: '',
                    extra: { noteId: note.id }
                }]
            });
            console.log('[LocalNotifications] Scheduled for note', note.id);
        } catch (e) {
            console.error('[LocalNotifications] schedule error:', e);
        }
    }

    async function cancelLocalNotification(noteId) {
        const LocalNotifications = window.Capacitor?.Plugins?.LocalNotifications;
        if (!LocalNotifications) return;
        try {
            await LocalNotifications.cancel({ notifications: [{ id: getNotificationId(noteId) }] });
        } catch (e) { /* ignore */ }
    }

    /* --- Realtime Database save (await) --- */
    async function saveToFirebase() {
        const user = fbUser();
        if (!user || !window.firebase?.database) return;
        try {
            await window.firebase.database().ref(`users/${user.uid}/notes`).set(notesData);
            console.log('✅ [Notes] Saved to Realtime DB.');
        } catch (e) { console.error('[Notes] save failed', e); }
    }

    /* --- Realtime Database listener (on 'value') --- */
    function setupRealtimeNotesListener() {
        const user = fbUser();
        if (!user || !window.firebase?.database) return;
        if (notesListenerAttached) return; // prevent duplicate listeners
        notesListenerAttached = true;
        const ref = window.firebase.database().ref(`users/${user.uid}/notes`);
        ref.on('value', (snap) => {
            const val = snap.val();
            if (val !== null && val !== undefined) {
                notesData = val;
                renderAll();
                console.log('✅ [Notes] Realtime update received.');
            }
        }, (err) => {
            console.error('[Notes] Realtime listener error:', err);
        });
    }

    async function loadFromFirebase() {
        setupRealtimeNotesListener();
    }

    // Auth listener
    if (window.firebase?.auth) {
        window.firebase.auth().onAuthStateChanged(u => {
            if (u) {
                notesListenerAttached = false; // reset for new user
                setupRealtimeNotesListener();
            }
        });
    }

    /* =========================================================
       OPEN / CLOSE PANEL
    ========================================================= */
    if (tileNotes) {
        tileNotes.addEventListener('click', () => {
            toolsHub.classList.add('hidden');
            panelNotes.classList.remove('hidden');
            loadFromFirebase();
            if (window.Notification && Notification.permission === 'default') {
                Notification.requestPermission();
            }
        });
    }

    // Back buttons
    panelNotes?.querySelectorAll('.panel-back, .notes-back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Save any open creator first
            if (creatorExpanded && !creatorExpanded.classList.contains('hidden')) collapseCreator(true);
            panelNotes.classList.add('hidden');
            toolsHub.classList.remove('hidden');
        });
    });

    /* =========================================================
       VIEW TOGGLE (grid / list) & REMINDER FILTER
    ========================================================= */
    if (viewToggleBtn) {
        viewToggleBtn.addEventListener('click', () => {
            isGridView = !isGridView;
            viewIcon.textContent = isGridView ? 'grid_view' : 'view_agenda';
            [pinnedGrid, othersGrid].forEach(g => {
                if (!g) return;
                if (isGridView) { g.classList.remove('notes-list-view'); }
                else            { g.classList.add('notes-list-view'); }
            });
        });
    }
    
    if (filterRemindersBtn) {
        filterRemindersBtn.addEventListener('click', () => {
            filterReminders = !filterReminders;
            filterRemindersBtn.classList.toggle('active', filterReminders);
            renderAll();
        });
    }

    /* =========================================================
       SEARCH
    ========================================================= */
    if (searchInput) {
        searchInput.addEventListener('input', e => {
            searchQuery = e.target.value.trim().toLowerCase();
            renderAll();
        });
    }

    /* =========================================================
       LINKIFY (URL to <a>)
    ========================================================= */
    function linkify(text) {
        if (!text) return '';
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return escapeHtml(text).replace(urlRegex, function(url) {
            return `<a href="${url}" class="note-link" data-url="${url}">${url}</a>`;
        });
    }

    // Handle clicks on dynamically created links
    document.addEventListener('click', e => {
        const link = e.target.closest('.note-link');
        if (!link) return;
        const url = link.dataset.url || link.href;
        if (!url) return;
        e.preventDefault();
        e.stopPropagation();
        
        if (window.electronAPI?.openExternal) {
            window.electronAPI.openExternal(url);
        } else {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    });

    /* =========================================================
       CREATOR EXPAND / COLLAPSE
    ========================================================= */
    function expandCreator(isChecklist = false) {
        creatorCollapsed?.classList.add('hidden');
        creatorExpanded?.classList.remove('hidden');
        creatorIsChecklist = isChecklist;
        if (isChecklist) {
            textInput?.classList.add('hidden');
            checklistArea?.classList.remove('hidden');
            if (checklistArea && !checklistArea.querySelector('.note-checklist-item')) addChecklistItem(checklistArea, '', false);
        } else {
            textInput?.classList.remove('hidden');
            checklistArea?.classList.add('hidden');
            textInput?.focus();
        }
        applyCreatorColor();
    }

    async function collapseCreator(save = true) {
        if (save) await saveNewNote();
        creatorCollapsed?.classList.remove('hidden');
        creatorExpanded?.classList.add('hidden');
        if (titleInput) titleInput.value = '';
        if (textInput) textInput.value = '';
        if (checklistArea) checklistArea.innerHTML = '';
        creatorPinned = false;
        creatorColor = '';
        creatorIsChecklist = false;
        creatorImage = null;
        creatorReminder = null;
        if (creatorImgCont) creatorImgCont.classList.add('hidden');
        if (creatorImg) creatorImg.src = '';
        
        updatePinBtn(btnNotePin, false);
        applyCreatorColor();
        noteColorPopup?.classList.add('hidden');
        closeReminderModal();
    }

    function applyCreatorColor() {
        if (creator) creator.style.backgroundColor = creatorColor || '';
    }

    if (creatorCollapsed) {
        creatorCollapsed.addEventListener('click', () => expandCreator(false));
    }
    if (btnNewNoteCheck) {
        btnNewNoteCheck.addEventListener('click', e => { e.stopPropagation(); expandCreator(true); });
    }
    if (btnCloseNote) {
        btnCloseNote.addEventListener('click', e => { e.stopPropagation(); collapseCreator(true); });
    }

    // Close creator when clicking outside
    document.addEventListener('click', e => {
        if (!panelNotes || panelNotes.classList.contains('hidden')) return;
        if (editModal && !editModal.classList.contains('hidden')) return;
        if (reminderModal && !reminderModal.classList.contains('hidden')) return;
        
        const isClickInsideCreator = creator && creator.contains(e.target);
        const isClickInsideColorPopup = noteColorPopup && noteColorPopup.contains(e.target);
        const isClickInsideEditColorPopup = editColorPopup && editColorPopup.contains(e.target);
        
        if (!isClickInsideCreator && !isClickInsideColorPopup && !isClickInsideEditColorPopup && creatorExpanded && !creatorExpanded.classList.contains('hidden')) {
            collapseCreator(true);
        }
    });

    /* =========================================================
       IMAGE UPLOADS & PASTING
    ========================================================= */
    function handleImageFile(file, isEdit = false) {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = e => {
            const base64 = e.target.result;
            if (isEdit) {
                if (editingId && notesData[editingId]) {
                    notesData[editingId].image = base64;
                    notesData[editingId].updatedAt = Date.now();
                }
                if(editImg) editImg.src = base64;
                if(editImgCont) editImgCont.classList.remove('hidden');
            } else {
                creatorImage = base64;
                if(creatorImg) creatorImg.src = base64;
                if(creatorImgCont) creatorImgCont.classList.remove('hidden');
                if (creatorExpanded && creatorExpanded.classList.contains('hidden')) expandCreator(false);
            }
        };
        reader.readAsDataURL(file);
    }

    if (btnNewNoteImg) {
        btnNewNoteImg.addEventListener('click', e => {
            e.stopPropagation();
            creatorFileInput?.click();
        });
    }
    if (creatorFileInput) {
        creatorFileInput.addEventListener('change', e => {
            if (e.target.files && e.target.files[0]) handleImageFile(e.target.files[0], false);
            creatorFileInput.value = '';
        });
    }
    if (creatorImgRemove) {
        creatorImgRemove.addEventListener('click', e => {
            e.stopPropagation();
            creatorImage = null;
            creatorImgCont?.classList.add('hidden');
            if (creatorImg) creatorImg.src = '';
        });
    }

    if (btnEditImg) {
        btnEditImg.addEventListener('click', e => {
            e.stopPropagation();
            editFileInput?.click();
        });
    }
    if (editFileInput) {
        editFileInput.addEventListener('change', e => {
            if (e.target.files && e.target.files[0]) handleImageFile(e.target.files[0], true);
            editFileInput.value = '';
        });
    }
    if (editImgRemove) {
        editImgRemove.addEventListener('click', e => {
            e.stopPropagation();
            if (editingId && notesData[editingId]) {
                notesData[editingId].image = null;
                notesData[editingId].updatedAt = Date.now();
            }
            editImgCont?.classList.add('hidden');
            if (editImg) editImg.src = '';
        });
    }

    // Paste event for images
    document.addEventListener('paste', e => {
        if (panelNotes && !panelNotes.classList.contains('hidden')) {
            const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
            if (!items) return;
            for (let index in items) {
                const item = items[index];
                if (item.kind === 'file' && item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    const isEdit = editModal && !editModal.classList.contains('hidden');
                    handleImageFile(file, isEdit);
                    e.preventDefault();
                    break;
                }
            }
        }
    });

    /* =========================================================
       REMINDERS & NOTIFICATIONS
    ========================================================= */
    function openReminderModal(targetId, e) {
        if (e) e.stopPropagation();
        reminderTargetId = targetId;
        
        let existingReminder = null;
        if (targetId === null) {
            existingReminder = creatorReminder;
        } else if (targetId && notesData[targetId]) {
            existingReminder = notesData[targetId].reminder;
        }

        if (existingReminder) {
            const d = new Date(existingReminder);
            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            if (reminderDatetime) reminderDatetime.value = d.toISOString().slice(0, 16);
            reminderClear?.classList.remove('hidden');
        } else {
            // Default to 1 hour from now
            const defaultDate = new Date(Date.now() + 3600000);
            defaultDate.setMinutes(defaultDate.getMinutes() - defaultDate.getTimezoneOffset());
            if (reminderDatetime) reminderDatetime.value = defaultDate.toISOString().slice(0, 16);
            reminderClear?.classList.add('hidden');
        }

        reminderModal?.classList.remove('hidden');
    }

    function closeReminderModal() {
        reminderModal?.classList.add('hidden');
    }

    if (btnNoteReminder) btnNoteReminder.addEventListener('click', e => openReminderModal(null, e));
    if (btnEditReminder) btnEditReminder.addEventListener('click', e => openReminderPopup(editingId, e));

    function openReminderPopup(targetId, e) {
        openReminderModal(targetId, e);
    }

    if (reminderBackdrop) reminderBackdrop.addEventListener('click', closeReminderModal);
    if (reminderCancel)   reminderCancel.addEventListener('click', closeReminderModal);

    if (reminderSave) {
        reminderSave.addEventListener('click', e => {
            e.stopPropagation();
            if (reminderDatetime && reminderDatetime.value) {
                applyReminder(new Date(reminderDatetime.value).getTime());
            } else {
                applyReminder(null);
            }
        });
    }

    if (reminderClear) {
        reminderClear.addEventListener('click', e => {
            e.stopPropagation();
            applyReminder(null);
        });
    }

    function applyReminder(timestamp) {
        if (reminderTargetId === null) {
            creatorReminder = timestamp;
        } else if (reminderTargetId && notesData[reminderTargetId]) {
            notesData[reminderTargetId].reminder = timestamp;
            notesData[reminderTargetId].reminderFired = false;
            notesData[reminderTargetId].updatedAt = Date.now();
            scheduleOneLocalNotification(notesData[reminderTargetId]);
            saveToFirebase();
            renderAll();
        }
        closeReminderModal();
    }

    function removeReminder(id) {
        if (notesData[id]) {
            notesData[id].reminder = null;
            notesData[id].reminderFired = false;
            cancelLocalNotification(id);
            saveToFirebase();
            renderAll();
        }
    }

    function playNotificationSound() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            if (ctx.state === 'suspended') ctx.resume();

            // 2-step warm chime chord (C5 -> E5 -> G5)
            const notes = [523.25, 659.25, 783.99];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const startTime = ctx.currentTime + i * 0.12;

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, startTime);

                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.3, startTime + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(startTime);
                osc.stop(startTime + 0.65);
            });
        } catch (e) { console.error('Audio chime error', e); }
    }

    // Background interval check for reminders
    setInterval(() => {
        const now = Date.now();
        let changed = false;
        const isCapacitor = typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform();

        Object.values(notesData).forEach(note => {
            if (note.reminder && now >= note.reminder && !note.reminderFired) {
                note.reminderFired = true;
                changed = true;
                
                // Only show HTML5 notifications and play custom sounds on Web/Electron
                if (!isCapacitor) {
                    const title = "SmartStudyHub: Напоминание";
                    const body = note.title || note.text || "Пришло время для вашей заметки!";
                    
                    playNotificationSound();
                    
                    if (window.electronAPI?.showNotification) {
                        window.electronAPI.showNotification(title, body);
                    } else if (window.Notification && Notification.permission === 'granted') {
                        new Notification(title, { body });
                    }
                }
            }
        });
        if (changed) {
            saveToFirebase();
            renderAll();
        }
    }, 8000);

    // Navigate to notes tab when a notification is clicked on Android
    if (typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform()) {
        const LocalNotifications = window.Capacitor.Plugins.LocalNotifications;
        if (LocalNotifications) {
            LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
                // Switch to the notes tab
                const notesTabBtn = document.querySelector('.nav-tab[data-tab="notes"]');
                if (notesTabBtn) {
                    notesTabBtn.click();
                }
                
                // Optional: open the specific note if extra data is provided
                const noteId = notificationAction.notification?.extra?.noteId;
                if (noteId && notesData[noteId]) {
                    setTimeout(() => openEditModal(noteId), 100);
                }
            });
        }
    }

    function formatReminderDate(ts) {
        const d = new Date(ts);
        const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return d.toLocaleDateString(undefined, options);
    }

    /* =========================================================
       PIN BUTTON
    ========================================================= */
    if (btnNotePin) {
        btnNotePin.addEventListener('click', e => {
            e.stopPropagation();
            creatorPinned = !creatorPinned;
            updatePinBtn(btnNotePin, creatorPinned);
        });
    }

    function updatePinBtn(btn, pinned) {
        if (!btn) return;
        const icon = btn.querySelector('.material-symbols-outlined');
        if (!icon) return;
        if (pinned) {
            icon.textContent = 'push_pin';
            icon.style.color = 'var(--primary-accent, #007aff)';
        } else {
            icon.textContent = 'push_pin';
            icon.style.color = '';
        }
        btn.classList.toggle('active', pinned);
    }

    /* =========================================================
       COLOR PICKER (creator)
    ========================================================= */
    if (btnNoteColor) {
        btnNoteColor.addEventListener('click', e => {
            e.stopPropagation();
            noteColorPopup?.classList.toggle('hidden');
        });
    }

    noteColorPopup?.querySelectorAll('.note-color-dot').forEach(dot => {
        dot.addEventListener('click', e => {
            e.stopPropagation();
            creatorColor = dot.dataset.color || '';
            applyCreatorColor();
            noteColorPopup.classList.add('hidden');
        });
    });

    /* =========================================================
       CHECKLIST
    ========================================================= */
    function addChecklistItem(container, text = '', checked = false) {
        const item = document.createElement('div');
        item.className = 'note-checklist-item';
        item.innerHTML = `
            <input type="checkbox" class="note-check-box" ${checked ? 'checked' : ''}>
            <input type="text" class="note-check-text" value="${escapeHtml(text)}" placeholder="Пункт списка...">
            <button class="note-check-del notes-icon-btn"><span class="material-symbols-outlined" style="font-size:16px">close</span></button>
        `;
        item.querySelector('.note-check-del').addEventListener('click', () => item.remove());
        item.querySelector('.note-check-text').addEventListener('keydown', ev => {
            if (ev.key === 'Enter') {
                ev.preventDefault();
                addChecklistItem(container, '', false);
                container.lastElementChild?.querySelector('.note-check-text')?.focus();
            }
        });
        container.appendChild(item);
    }

    function getChecklistItems(container) {
        return Array.from(container.querySelectorAll('.note-checklist-item')).map(item => ({
            text: item.querySelector('.note-check-text')?.value || '',
            checked: item.querySelector('.note-check-box')?.checked || false
        }));
    }

    function renderChecklistItems(container, items = []) {
        container.innerHTML = '';
        items.forEach(i => addChecklistItem(container, i.text, i.checked));
        addChecklistItem(container, '', false);
    }

    /* =========================================================
       SAVE / CREATE NOTE
    ========================================================= */
    async function saveNewNote() {
        const title = titleInput ? titleInput.value.trim() : '';
        let text = '';
        let checklist = null;

        if (creatorIsChecklist) {
            checklist = getChecklistItems(checklistArea).filter(i => i.text);
            if (!title && !checklist.length && !creatorImage) return;
        } else {
            text = textInput ? textInput.value.trim() : '';
            if (!title && !text && !creatorImage) return;
        }

        const id = 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        const newNote = {
            id, title, text,
            checklist: checklist || null,
            image: creatorImage,
            reminder: creatorReminder,
            reminderFired: false,
            color: creatorColor,
            pinned: creatorPinned,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        notesData[id] = newNote;
        if (newNote.reminder) {
            scheduleOneLocalNotification(newNote);
        }
        await saveToFirebase();
        renderAll();
    }

    /* =========================================================
       RENDER ALL
    ========================================================= */
    function renderAll() {
        const query = searchQuery;
        let allNotes = Object.values(notesData);

        if (filterReminders) {
            allNotes = allNotes.filter(n => n.reminder !== null && n.reminder !== undefined);
        }

        if (query) {
            allNotes = allNotes.filter(n =>
                (n.title || '').toLowerCase().includes(query) ||
                (n.text || '').toLowerCase().includes(query) ||
                (n.checklist || []).some(i => i.text.toLowerCase().includes(query))
            );
        }

        const pinned = allNotes.filter(n => n.pinned).sort((a, b) => b.updatedAt - a.updatedAt);
        const others = allNotes.filter(n => !n.pinned).sort((a, b) => b.updatedAt - a.updatedAt);

        // Pinned section
        if (pinned.length) {
            pinnedSection?.classList.remove('hidden');
            if (pinnedGrid) renderGrid(pinnedGrid, pinned);
        } else {
            pinnedSection?.classList.add('hidden');
            if (pinnedGrid) pinnedGrid.innerHTML = '';
        }

        // Others section label
        if (pinned.length && others.length) {
            othersLabel?.classList.remove('hidden');
        } else {
            othersLabel?.classList.add('hidden');
        }

        if (othersGrid) renderGrid(othersGrid, others);

        // Empty state handling
        if (!pinned.length && !others.length) {
            emptyState?.classList.remove('hidden');
            const p = emptyState?.querySelector('p');
            if (p) {
                if (filterReminders) {
                    p.textContent = (window.translations?.[window.currentLanguage || 'ru']?.noteRemindersEmpty) || 'Заметок с напоминаниями пока нет';
                } else {
                    p.textContent = (window.translations?.[window.currentLanguage || 'ru']?.noteEmptyState) || 'Ваши заметки появятся здесь';
                }
            }
        } else {
            emptyState?.classList.add('hidden');
        }
    }

    function renderGrid(container, notes) {
        container.innerHTML = '';
        notes.forEach(note => container.appendChild(makeCard(note)));
    }

    /* =========================================================
       CARD CREATION
    ========================================================= */
    function makeCard(note) {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.dataset.id = note.id;
        if (note.color) card.style.backgroundColor = note.color;

        // Image
        if (note.image) {
            const imgCont = document.createElement('div');
            imgCont.className = 'note-image-container';
            imgCont.innerHTML = `<img src="${note.image}" alt="Note image">`;
            card.appendChild(imgCont);
        }

        // Pin indicator
        if (note.pinned) {
            const pinEl = document.createElement('span');
            pinEl.className = 'note-card-pin material-symbols-outlined';
            pinEl.textContent = 'push_pin';
            card.appendChild(pinEl);
        }

        // Title
        if (note.title) {
            const t = document.createElement('div');
            t.className = 'note-card-title';
            t.textContent = note.title;
            card.appendChild(t);
        }

        // Body text (linkified)
        if (note.text) {
            const b = document.createElement('div');
            b.className = 'note-card-body';
            b.innerHTML = linkify(note.text);
            card.appendChild(b);
        }

        // Checklist preview (linkified text)
        if (note.checklist?.length) {
            const cl = document.createElement('div');
            cl.className = 'note-card-checklist';
            note.checklist.slice(0, 5).forEach(item => {
                const row = document.createElement('div');
                row.className = 'note-card-check-row' + (item.checked ? ' checked' : '');
                row.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;margin-right:4px">${item.checked ? 'check_box' : 'check_box_outline_blank'}</span><span>${linkify(item.text)}</span>`;
                cl.appendChild(row);
            });
            if (note.checklist.length > 5) {
                const more = document.createElement('div');
                more.style.cssText = 'font-size:0.78rem;color:var(--text-color-secondary);margin-top:4px;';
                more.textContent = `+${note.checklist.length - 5} еще`;
                cl.appendChild(more);
            }
            card.appendChild(cl);
        }

        // Reminder Chip
        if (note.reminder) {
            const isExpired = Date.now() > note.reminder;
            const rChip = document.createElement('div');
            rChip.className = 'note-reminder-chip' + (isExpired ? ' expired' : '');
            rChip.innerHTML = `
                <span class="material-symbols-outlined" style="font-size: 14px;">notifications</span>
                <span>${formatReminderDate(note.reminder)}</span>
                <button class="note-reminder-remove" aria-label="Remove reminder"><span class="material-symbols-outlined" style="font-size: 14px;">close</span></button>
            `;
            rChip.querySelector('.note-reminder-remove').addEventListener('click', e => {
                e.stopPropagation();
                removeReminder(note.id);
            });
            card.appendChild(rChip);
        }

        // Bottom action bar (hidden until hover)
        const actions = document.createElement('div');
        actions.className = 'note-card-actions';

        const pinBtn = document.createElement('button');
        pinBtn.className = 'notes-icon-btn note-card-action-btn';
        pinBtn.title = 'Закрепить';
        pinBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px;${note.pinned ? 'color:var(--primary-accent)' : ''}">push_pin</span>`;
        pinBtn.onclick = e => { e.stopPropagation(); togglePin(note.id); };
        actions.appendChild(pinBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'notes-icon-btn note-card-action-btn';
        delBtn.title = 'Удалить';
        delBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px">delete</span>';
        delBtn.onclick = e => { e.stopPropagation(); deleteNote(note.id); };
        actions.appendChild(delBtn);

        card.appendChild(actions);

        // Click opens editor
        card.addEventListener('click', () => openEditModal(note.id));
        return card;
    }

    /* =========================================================
       PIN / DELETE
    ========================================================= */
    function togglePin(id) {
        if (!notesData[id]) return;
        notesData[id].pinned = !notesData[id].pinned;
        notesData[id].updatedAt = Date.now();
        saveToFirebase();
        renderAll();
    }

    function deleteNote(id) {
        if (!notesData[id]) return;
        cancelLocalNotification(id);
        delete notesData[id];
        saveToFirebase();
        renderAll();
    }

    /* =========================================================
       EDIT MODAL
    ========================================================= */
    function openEditModal(id) {
        const note = notesData[id];
        if (!note) return;
        editingId = id;

        if (editTitle) editTitle.value = note.title || '';
        if (note.checklist) {
            editText?.classList.add('hidden');
            editChecklist?.classList.remove('hidden');
            renderChecklistItems(editChecklist, note.checklist);
        } else {
            editText?.classList.remove('hidden');
            editChecklist?.classList.add('hidden');
            if (editText) editText.value = note.text || '';
        }
        
        if (note.image) {
            if(editImg) editImg.src = note.image;
            if(editImgCont) editImgCont.classList.remove('hidden');
        } else {
            if(editImg) editImg.src = '';
            if(editImgCont) editImgCont.classList.add('hidden');
        }

        if (editCard) editCard.style.backgroundColor = note.color || '';
        updatePinBtn(btnEditPin, note.pinned);
        editModal?.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            if (!note.checklist && editText) editText.focus();
        }, 50);
    }

    async function closeEditModal(save = true) {
        if (save && editingId && notesData[editingId]) {
            notesData[editingId].title = editTitle ? editTitle.value.trim() : '';
            if (notesData[editingId].checklist !== null && notesData[editingId].checklist !== undefined) {
                notesData[editingId].checklist = getChecklistItems(editChecklist).filter(i => i.text);
            } else {
                notesData[editingId].text = editText ? editText.value.trim() : '';
            }
            notesData[editingId].updatedAt = Date.now();
            if (notesData[editingId].reminder) {
                scheduleOneLocalNotification(notesData[editingId]);
            }
            await saveToFirebase();
            renderAll();
        }
        editModal?.classList.add('hidden');
        document.body.style.overflow = '';
        if (editChecklist) editChecklist.innerHTML = '';
        editingId = null;
        editColorPopup?.classList.add('hidden');
        closeReminderModal();
    }

    if (btnEditClose)   btnEditClose.addEventListener('click',   () => closeEditModal(true));
    if (editBackdrop)   editBackdrop.addEventListener('click',   () => closeEditModal(true));

    if (btnEditDelete) {
        btnEditDelete.addEventListener('click', e => {
            e.stopPropagation();
            const id = editingId;
            closeEditModal(false);
            deleteNote(id);
        });
    }

    if (btnEditPin) {
        btnEditPin.addEventListener('click', e => {
            e.stopPropagation();
            if (editingId && notesData[editingId]) {
                notesData[editingId].pinned = !notesData[editingId].pinned;
                updatePinBtn(btnEditPin, notesData[editingId].pinned);
            }
        });
    }

    // Edit color picker
    if (btnEditColor) {
        btnEditColor.addEventListener('click', e => {
            e.stopPropagation();
            editColorPopup?.classList.toggle('hidden');
        });
    }
    editColorPopup?.querySelectorAll('.note-color-dot').forEach(dot => {
        dot.addEventListener('click', e => {
            e.stopPropagation();
            const color = dot.dataset.color || '';
            if (editCard) editCard.style.backgroundColor = color;
            if (editingId && notesData[editingId]) {
                notesData[editingId].color = color;
            }
            editColorPopup.classList.add('hidden');
        });
    });

    // Keyboard: Escape closes modal
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (reminderModal && !reminderModal.classList.contains('hidden')) {
                closeReminderModal();
            } else if (editModal && !editModal.classList.contains('hidden')) {
                closeEditModal(true);
            }
        }
    });

    /* =========================================================
       GLOBAL AI API
    ========================================================= */
    window.aiListNotes = () => Object.values(notesData).map(n => ({
        id: n.id, title: n.title, text: n.text, color: n.color, pinned: n.pinned, hasImage: !!n.image, reminder: n.reminder
    }));

    window.aiCreateNote = (title, text, color) => {
        const id = 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        notesData[id] = { id, title: title || '', text: text || '', checklist: null, color: color || '', pinned: false, createdAt: Date.now(), updatedAt: Date.now() };
        saveToFirebase(); renderAll();
        return id;
    };

    window.aiUpdateNote = (id, title, text, color) => {
        if (!notesData[id]) return false;
        if (title !== undefined) notesData[id].title = title;
        if (text  !== undefined) notesData[id].text  = text;
        if (color !== undefined) notesData[id].color = color;
        notesData[id].updatedAt = Date.now();
        saveToFirebase(); renderAll();
        return true;
    };

    window.aiDeleteNote = id => {
        if (!notesData[id]) return false;
        delete notesData[id]; saveToFirebase(); renderAll();
        return true;
    };

    window.syncNotesToFirebase  = saveToFirebase;
    window.fetchNotesFromFirebase = loadFromFirebase;
    window.getNotesData = () => notesData;

    /* =========================================================
       UTILITY
    ========================================================= */
    function escapeHtml(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

})();
