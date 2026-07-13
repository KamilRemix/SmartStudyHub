/**
 * SmartStudyHub — Notes Module (Google Keep style)
 * Full-featured: pinning, color picker, search, list/grid view,
 * note modal editor, Firebase sync, AI API.
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

    /* =========================================================
       STATE
    ========================================================= */
    let notesData    = {};
    let isGridView   = true;     // true = grid, false = list
    let creatorPinned = false;
    let creatorColor = '';
    let creatorIsChecklist = false;
    let searchQuery  = '';
    let editingId    = null;     // null = create, else = editing existing

    /* =========================================================
       FIREBASE
    ========================================================= */
    function fbUser() {
        return window.firebase?.auth?.()?.currentUser ?? null;
    }

    async function saveToFirebase() {
        const user = fbUser();
        if (!user || !window.firebase?.database) return;
        try {
            await window.firebase.database().ref(`users/${user.uid}/notes`).set(notesData);
        } catch (e) { console.error('[Notes] save failed', e); }
    }

    async function loadFromFirebase() {
        const user = fbUser();
        if (!user || !window.firebase?.database) return;
        try {
            const snap = await window.firebase.database().ref(`users/${user.uid}/notes`).once('value');
            const val = snap.val();
            notesData = val || {};
            renderAll();
        } catch (e) { console.error('[Notes] load failed', e); }
    }

    // Auth listener
    if (window.firebase?.auth) {
        window.firebase.auth().onAuthStateChanged(u => { if (u) loadFromFirebase(); });
    }

    /* =========================================================
       OPEN / CLOSE PANEL
    ========================================================= */
    if (tileNotes) {
        tileNotes.addEventListener('click', () => {
            toolsHub.classList.add('hidden');
            panelNotes.classList.remove('hidden');
            loadFromFirebase();
        });
    }

    // Back buttons
    panelNotes?.querySelectorAll('.panel-back, .notes-back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Save any open creator first
            if (!creatorExpanded.classList.contains('hidden')) collapseCreator(true);
            panelNotes.classList.add('hidden');
            toolsHub.classList.remove('hidden');
        });
    });

    /* =========================================================
       VIEW TOGGLE (grid / list)
    ========================================================= */
    if (viewToggleBtn) {
        viewToggleBtn.addEventListener('click', () => {
            isGridView = !isGridView;
            viewIcon.textContent = isGridView ? 'grid_view' : 'view_agenda';
            [pinnedGrid, othersGrid].forEach(g => {
                if (isGridView) { g.classList.remove('notes-list-view'); }
                else            { g.classList.add('notes-list-view'); }
            });
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
       CREATOR EXPAND / COLLAPSE
    ========================================================= */
    function expandCreator(isChecklist = false) {
        creatorCollapsed.classList.add('hidden');
        creatorExpanded.classList.remove('hidden');
        creatorIsChecklist = isChecklist;
        if (isChecklist) {
            textInput.classList.add('hidden');
            checklistArea.classList.remove('hidden');
            if (!checklistArea.querySelector('.note-checklist-item')) addChecklistItem(checklistArea, '', false);
        } else {
            textInput.classList.remove('hidden');
            checklistArea.classList.add('hidden');
            textInput.focus();
        }
        applyCreatorColor();
    }

    function collapseCreator(save = true) {
        if (save) saveNewNote();
        creatorCollapsed.classList.remove('hidden');
        creatorExpanded.classList.add('hidden');
        titleInput.value = '';
        textInput.value = '';
        checklistArea.innerHTML = '';
        creatorPinned = false;
        creatorColor = '';
        creatorIsChecklist = false;
        updatePinBtn(btnNotePin, false);
        applyCreatorColor();
        noteColorPopup?.classList.add('hidden');
    }

    function applyCreatorColor() {
        creator.style.backgroundColor = creatorColor || '';
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
        if (creator && !creator.contains(e.target) && !creatorExpanded.classList.contains('hidden')) {
            collapseCreator(true);
        }
    });

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
            <input type="text" class="note-check-text" value="${escapeHtml(text)}" placeholder="List item...">
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
        // Add empty item at end
        addChecklistItem(container, '', false);
    }

    /* =========================================================
       SAVE / CREATE NOTE
    ========================================================= */
    function saveNewNote() {
        const title = titleInput.value.trim();
        let text = '';
        let checklist = null;

        if (creatorIsChecklist) {
            checklist = getChecklistItems(checklistArea).filter(i => i.text);
            if (!title && !checklist.length) return;
        } else {
            text = textInput.value.trim();
            if (!title && !text) return;
        }

        const id = 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        notesData[id] = {
            id, title, text,
            checklist: checklist || null,
            color: creatorColor,
            pinned: creatorPinned,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        saveToFirebase();
        renderAll();
    }

    /* =========================================================
       RENDER ALL
    ========================================================= */
    function renderAll() {
        const query = searchQuery;
        let allNotes = Object.values(notesData);

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

        // Empty state
        if (!pinned.length && !others.length) {
            emptyState?.classList.remove('hidden');
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

        // Body text
        if (note.text) {
            const b = document.createElement('div');
            b.className = 'note-card-body';
            b.textContent = note.text;
            card.appendChild(b);
        }

        // Checklist preview
        if (note.checklist?.length) {
            const cl = document.createElement('div');
            cl.className = 'note-card-checklist';
            note.checklist.slice(0, 5).forEach(item => {
                const row = document.createElement('div');
                row.className = 'note-card-check-row' + (item.checked ? ' checked' : '');
                row.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;margin-right:4px">${item.checked ? 'check_box' : 'check_box_outline_blank'}</span><span>${escapeHtml(item.text)}</span>`;
                cl.appendChild(row);
            });
            if (note.checklist.length > 5) {
                const more = document.createElement('div');
                more.style.cssText = 'font-size:0.78rem;color:var(--text-color-secondary);margin-top:4px;';
                more.textContent = `+${note.checklist.length - 5} more`;
                cl.appendChild(more);
            }
            card.appendChild(cl);
        }

        // Bottom action bar (hidden until hover)
        const actions = document.createElement('div');
        actions.className = 'note-card-actions';

        const pinBtn = document.createElement('button');
        pinBtn.className = 'notes-icon-btn note-card-action-btn';
        pinBtn.title = 'Pin / Unpin';
        pinBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px;${note.pinned ? 'color:var(--primary-accent)' : ''}">push_pin</span>`;
        pinBtn.onclick = e => { e.stopPropagation(); togglePin(note.id); };
        actions.appendChild(pinBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'notes-icon-btn note-card-action-btn';
        delBtn.title = 'Delete';
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

        editTitle.value = note.title || '';
        if (note.checklist) {
            editText.classList.add('hidden');
            editChecklist.classList.remove('hidden');
            renderChecklistItems(editChecklist, note.checklist);
        } else {
            editText.classList.remove('hidden');
            editChecklist.classList.add('hidden');
            editText.value = note.text || '';
        }

        editCard.style.backgroundColor = note.color || '';
        updatePinBtn(btnEditPin, note.pinned);
        editModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            if (!note.checklist) editText.focus();
        }, 50);
    }

    function closeEditModal(save = true) {
        if (save && editingId && notesData[editingId]) {
            notesData[editingId].title = editTitle.value.trim();
            if (notesData[editingId].checklist !== null && notesData[editingId].checklist !== undefined) {
                notesData[editingId].checklist = getChecklistItems(editChecklist).filter(i => i.text);
            } else {
                notesData[editingId].text = editText.value.trim();
            }
            notesData[editingId].updatedAt = Date.now();
            saveToFirebase();
            renderAll();
        }
        editModal.classList.add('hidden');
        document.body.style.overflow = '';
        editChecklist.innerHTML = '';
        editingId = null;
        editColorPopup?.classList.add('hidden');
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
            editCard.style.backgroundColor = color;
            if (editingId && notesData[editingId]) {
                notesData[editingId].color = color;
            }
            editColorPopup.classList.add('hidden');
        });
    });

    // Keyboard: Escape closes modal
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && editModal && !editModal.classList.contains('hidden')) {
            closeEditModal(true);
        }
    });

    /* =========================================================
       GLOBAL AI API
    ========================================================= */
    window.aiListNotes = () => Object.values(notesData).map(n => ({
        id: n.id, title: n.title, text: n.text, color: n.color, pinned: n.pinned
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
