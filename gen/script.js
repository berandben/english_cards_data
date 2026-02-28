// =========================
// DATOS PRINCIPALES
// =========================
let lessonData = {
    slug: "",
    meta: {
        title: "",
        subtitle: "",
        difficulty: "A2",
        tags: [],
        icon: ""
    },
    header: {
        badges: []
    },
    sections: []
};

let loadedFileName = "";
let sectionCounter = 0;
let draggedSectionIndex = null;
let draggedBlockData = null;

// Bloques permitidos por tipo de sección
const allowedBlocksBySectionType = {
    'info-grid': ['paragraph', 'quote', 'list', 'chips'],
    'two-columns': ['table'],
    'formulas': ['code-block', 'info-box'],
    'grid-compare': ['card'],
    'comparison': ['compare-box', 'table']
};

// Tipos de bloque que NO muestran label
const blocksWithoutLabel = ['card', 'compare-box'];

// =========================
// INICIALIZACIÓN
// =========================
document.addEventListener('DOMContentLoaded', function() {
    addSection();
    setupFileUpload();
});

// =========================
// FILE UPLOAD FUNCTIONS
// =========================
function setupFileUpload() {
    const fileUploadContainer = document.getElementById('fileUploadContainer');
    const jsonFileInput = document.getElementById('jsonFileInput');

    fileUploadContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadContainer.classList.add('dragover');
    });

    fileUploadContainer.addEventListener('dragleave', () => {
        fileUploadContainer.classList.remove('dragover');
    });

    fileUploadContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadContainer.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/json') {
            loadJSONFile(files[0]);
        } else {
            alert('Por favor selecciona un archivo JSON válido');
        }
    });

    jsonFileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            loadJSONFile(files[0]);
        }
    });
}

function loadJSONFile(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            if (!data.meta || !data.sections) {
                throw new Error('El JSON no tiene la estructura correcta (falta meta o sections)');
            }

            lessonData = {
                slug: data.slug || '',
                meta: {
                    title: data.meta.title || '',
                    subtitle: data.meta.subtitle || '',
                    difficulty: data.meta.difficulty || 'A2',
                    tags: Array.isArray(data.meta.tags) ? data.meta.tags : [],
                    icon: data.meta.icon || ''
                },
                header: {
                    badges: Array.isArray(data.header?.badges) ? data.header.badges : []
                },
                sections: Array.isArray(data.sections) ? data.sections : []
            };

            sectionCounter = lessonData.sections.length;

            // Mostrar información del archivo cargado
            document.getElementById('loadedFileName').textContent = `📄 ${file.name} cargado (${lessonData.sections.length} secciones)`;
            document.getElementById('loadedFileInfo').style.display = 'flex';

            // Actualizar campos del formulario
            document.getElementById('slug').value = lessonData.slug;
            document.getElementById('title').value = cleanPrefix(lessonData.meta.title);
            document.getElementById('subtitle').value = lessonData.meta.subtitle;
            document.getElementById('difficulty').value = lessonData.meta.difficulty;
            document.getElementById('icon').value = lessonData.meta.icon;
            document.getElementById('tags').value = lessonData.meta.tags.join(', ');
            
            const badgesClean = lessonData.header.badges.map(b => cleanPrefix(b)).join(', ');
            document.getElementById('badges').value = badgesClean;
            
            document.getElementById('check-title').checked = lessonData.meta.title?.startsWith('@_') || false;
            document.getElementById('check-badges').checked = lessonData.header.badges.some(b => b.startsWith('@_')) || false;

            renderSectionsEditor();
            updatePreview();

            alert(`✅ Archivo "${file.name}" cargado exitosamente!`);

        } catch (error) {
            console.error('Error loading JSON:', error);
            alert(`❌ Error al cargar el archivo: ${error.message}`);
        }
    };

    reader.onerror = () => {
        alert('❌ Error al leer el archivo');
    };

    reader.readAsText(file);
}

function clearLoadedFile() {
    loadedFileName = "";
    document.getElementById('loadedFileInfo').style.display = 'none';
    document.getElementById('jsonFileInput').value = '';
}

// =========================
// MODAL FUNCTIONS
// =========================
function showNewDocumentModal() {
    document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

function confirmNewDocument() {
    closeModal();
    
    lessonData = {
        slug: "",
        meta: {
            title: "",
            subtitle: "",
            difficulty: "A2",
            tags: [],
            icon: ""
        },
        header: {
            badges: []
        },
        sections: []
    };

    sectionCounter = 0;
    clearLoadedFile();

    document.getElementById('slug').value = '';
    document.getElementById('title').value = '';
    document.getElementById('subtitle').value = '';
    document.getElementById('difficulty').value = 'A2';
    document.getElementById('icon').value = '';
    document.getElementById('tags').value = '';
    document.getElementById('badges').value = '';
    document.getElementById('check-title').checked = false;
    document.getElementById('check-badges').checked = false;

    addSection();
}

// =========================
// PREFIX FUNCTIONS
// =========================
function togglePrefix(field) {
    updatePreview();
}

function getValueWithPrefix(inputId, checkId) {
    const value = document.getElementById(inputId)?.value || '';
    const addPrefix = document.getElementById(checkId)?.checked || false;
    if (addPrefix && value) {
        return '@_' + value;
    }
    return value;
}

function cleanPrefix(text) {
    if (!text) return '';
    return text.startsWith('@_') ? text.slice(2) : text;
}

// =========================
// SECTION FUNCTIONS
// =========================
function addSection() {
    sectionCounter++;
    const section = {
        id: `section-${sectionCounter}-${Date.now()}`,
        title: `Nueva Sección ${sectionCounter}`,
        type: 'info-grid',
        blocks: []
    };
    lessonData.sections.push(section);
    renderSectionsEditor();
    updatePreview();
}

function removeSection(index) {
    if (lessonData.sections.length <= 1) {
        alert('Debe haber al menos una sección en la lección.');
        return;
    }
    
    const confirmDelete = confirm(`¿Estás seguro de eliminar la sección "${lessonData.sections[index].title}"?`);
    if (!confirmDelete) return;
    
    lessonData.sections.splice(index, 1);
    renderSectionsEditor();
    updatePreview();
}

function updateSection(index, field, value) {
    lessonData.sections[index][field] = value;
    if (field === 'type') {
        const allowedBlocks = allowedBlocksBySectionType[value] || [];
        lessonData.sections[index].blocks = lessonData.sections[index].blocks.filter(
            block => allowedBlocks.includes(block.type)
        );
    }
    renderSectionsEditor();
    updatePreview();
}

// =========================
// BLOCK FUNCTIONS
// =========================
function addBlock(sectionIndex, blockType) {
    const sectionType = lessonData.sections[sectionIndex].type;
    const allowedBlocks = allowedBlocksBySectionType[sectionType] || [];
    
    if (!allowedBlocks.includes(blockType)) {
        alert(`El tipo de bloque "${blockType}" no está permitido para secciones de tipo "${sectionType}"`);
        return;
    }

    const block = {
        type: blockType,
        label: '',
        content: '',
        items: [],
        headers: [],
        rows: [],
        style: '',
        value: '',
        description: ''
    };

    if (blockType === 'table') {
        block.headers = ['Verb', 'Rule', 'Sound'];
        block.rows = [
            {
                group: 'Regular Verbs - /t/ Sound',
                items: [
                    ['walked', '/t/', 'after voiceless sounds'],
                    ['looked', '/t/', 'after voiceless sounds']
                ]
            },
            {
                group: 'Regular Verbs - /d/ Sound',
                items: [
                    ['played', '/d/', 'after voiced sounds'],
                    ['called', '/d/', 'after voiced sounds']
                ]
            }
        ];
    } else if (blockType === 'list' || blockType === 'chips') {
        block.items = ['Item 1', 'Item 2', 'Item 3'];
    } else if (blockType === 'code-block') {
        block.items = ['Subject + Past Verb', 'I / You / We / They + verb', 'He / She / It + verb + s'];
    } else if (blockType === 'card') {
        block.label = 'Singular';
        block.content = 'I / He / She / It';
        block.value = 'was';
    } else if (blockType === 'compare-box') {
        block.label = 'Simple Past';
        block.content = 'I met him in 2019.';
        block.description = 'Specific time in the past';
    }

    lessonData.sections[sectionIndex].blocks.push(block);
    renderSectionsEditor();
    updatePreview();
}

function removeBlock(sectionIndex, blockIndex) {
    lessonData.sections[sectionIndex].blocks.splice(blockIndex, 1);
    renderSectionsEditor();
    updatePreview();
}

function updateBlock(sectionIndex, blockIndex, field, value) {
    lessonData.sections[sectionIndex].blocks[blockIndex][field] = value;
    renderSectionsEditor();
    updatePreview();
}

function updateBlockContentWithPrefix(sectionIndex, blockIndex, addPrefix) {
    const block = lessonData.sections[sectionIndex].blocks[blockIndex];
    let value = block.content || '';
    
    if (addPrefix && value && !value.startsWith('@_')) {
        value = '@_' + value;
    } else if (!addPrefix && value.startsWith('@_')) {
        value = value.slice(2);
    }
    
    lessonData.sections[sectionIndex].blocks[blockIndex].content = value;
    renderSectionsEditor();
    updatePreview();
}

function updateBlockValueWithPrefix(sectionIndex, blockIndex, addPrefix) {
    const block = lessonData.sections[sectionIndex].blocks[blockIndex];
    let value = block.value || '';
    
    if (addPrefix && value && !value.startsWith('@_')) {
        value = '@_' + value;
    } else if (!addPrefix && value.startsWith('@_')) {
        value = value.slice(2);
    }
    
    lessonData.sections[sectionIndex].blocks[blockIndex].value = value;
    renderSectionsEditor();
    updatePreview();
}

// =========================
// LIST FUNCTIONS (con audio)
// =========================
function updateListItem(sectionIndex, blockIndex, itemIndex, value, addPrefix) {
    const block = lessonData.sections[sectionIndex].blocks[blockIndex];
    if (!block.items) block.items = [];
    
    let newValue = value;
    if (addPrefix && value && !value.startsWith('@_')) {
        newValue = '@_' + value;
    } else if (!addPrefix && value.startsWith('@_')) {
        newValue = value.slice(2);
    }
    
    block.items[itemIndex] = newValue;
    renderSectionsEditor();
    updatePreview();
}

function addListItem(sectionIndex, blockIndex) {
    const block = lessonData.sections[sectionIndex].blocks[blockIndex];
    if (!block.items) block.items = [];
    block.items.push('Nuevo ítem');
    renderSectionsEditor();
    updatePreview();
}

function removeListItem(sectionIndex, blockIndex, itemIndex) {
    const block = lessonData.sections[sectionIndex].blocks[blockIndex];
    if (block.items && block.items.length > 1) {
        block.items.splice(itemIndex, 1);
    } else {
        block.items = ['Item 1'];
    }
    renderSectionsEditor();
    updatePreview();
}

// =========================
// TABLE FUNCTIONS (con grupos)
// =========================
function addTableGroup(sectionIndex, blockIndex) {
    const block = lessonData.sections[sectionIndex].blocks[blockIndex];
    if (!block.rows) block.rows = [];
    
    block.rows.push({
        group: "Nuevo Grupo",
        items: [["", "", "", ""]]
    });
    
    renderSectionsEditor();
    updatePreview();
}

function removeTableGroup(sectionIndex, blockIndex, groupIndex) {
    const block = lessonData.sections[sectionIndex].blocks[blockIndex];
    if (block.rows && block.rows.length > 1) {
        block.rows.splice(groupIndex, 1);
    } else {
        block.rows[0] = {
            group: "Grupo",
            items: [["", "", "", ""]]
        };
    }
    renderSectionsEditor();
    updatePreview();
}

function updateTableGroup(sectionIndex, blockIndex, groupIndex, value) {
    const block = lessonData.sections[sectionIndex].blocks[blockIndex];
    if (block.rows && block.rows[groupIndex]) {
        block.rows[groupIndex].group = value;
    }
    renderSectionsEditor();
    updatePreview();
}

function addTableRow(sectionIndex, blockIndex, groupIndex) {
    const block = lessonData.sections[sectionIndex].blocks[blockIndex];
    if (block.rows && block.rows[groupIndex]) {
        if (!block.rows[groupIndex].items) {
            block.rows[groupIndex].items = [];
        }
        const numColumns = block.headers ? block.headers.length : 4;
        block.rows[groupIndex].items.push(Array(numColumns).fill(""));
    }
    renderSectionsEditor();
    updatePreview();
}

function removeTableRow(sectionIndex, blockIndex, groupIndex, rowIndex) {
    const block = lessonData.sections[sectionIndex].blocks[blockIndex];
    if (block.rows && 
        block.rows[groupIndex] && 
        block.rows[groupIndex].items && 
        block.rows[groupIndex].items.length > 1) {
        block.rows[groupIndex].items.splice(rowIndex, 1);
    }
    renderSectionsEditor();
    updatePreview();
}

function updateTableCell(sectionIndex, blockIndex, groupIndex, rowIndex, colIndex, value) {
    const block = lessonData.sections[sectionIndex].blocks[blockIndex];
    if (block.rows && 
        block.rows[groupIndex] && 
        block.rows[groupIndex].items && 
        block.rows[groupIndex].items[rowIndex]) {
        
        while (block.rows[groupIndex].items[rowIndex].length <= colIndex) {
            block.rows[groupIndex].items[rowIndex].push("");
        }
        
        block.rows[groupIndex].items[rowIndex][colIndex] = value;
    }
    renderSectionsEditor();
    updatePreview();
}

function updateTableHeaders(sectionIndex, blockIndex, value) {
    const block = lessonData.sections[sectionIndex].blocks[blockIndex];
    const newHeaders = value.split(',').map(h => h.trim());
    block.headers = newHeaders;
    
    if (block.rows) {
        block.rows.forEach(group => {
            if (group.items) {
                group.items.forEach(row => {
                    while (row.length < newHeaders.length) {
                        row.push("");
                    }
                    while (row.length > newHeaders.length) {
                        row.pop();
                    }
                });
            }
        });
    }
    
    renderSectionsEditor();
    updatePreview();
}

function parseTableRows(value) {
    if (!value) return [];
    try {
        return value.split('|').map(row => row.split(',').map(cell => cell.trim()));
    } catch (e) {
        console.error('Error parsing table rows:', e);
        return [];
    }
}

function formatTableRows(rows) {
    if (!rows || !Array.isArray(rows)) return '';
    return rows.map(row => row.join(',')).join('|');
}

// =========================
// RENDER FUNCTIONS
// =========================
function renderSectionsEditor() {
    const container = document.getElementById('sectionsContainer');
    container.innerHTML = lessonData.sections.map((section, sIndex) => {
        const allowedBlocks = allowedBlocksBySectionType[section.type] || [];
        
        return `
            <div class="section-card" data-section-index="${sIndex}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="material-symbols-outlined drag-handle" draggable="false">drag_indicator</span>
                        <strong>Sección ${String(sIndex + 1).padStart(2, '0')}</strong>
                    </div>
                    <button class="btn btn-danger btn-danger-sm" onclick="removeSection(${sIndex})">
                        <span class="material-symbols-outlined" style="font-size: 14px;">delete</span>
                        Eliminar
                    </button>
                </div>
                
                <div class="form-group">
                    <label>ID</label>
                    <input type="text" value="${section.id}" onchange="updateSection(${sIndex}, 'id', this.value)">
                </div>
                
                <div class="form-group">
                    <label>Título</label>
                    <input type="text" value="${section.title}" onchange="updateSection(${sIndex}, 'title', this.value)">
                </div>
                
                <div class="form-group">
                    <label>Tipo de Sección</label>
                    <select onchange="updateSection(${sIndex}, 'type', this.value)">
                        <option value="info-grid" ${section.type === 'info-grid' ? 'selected' : ''}>info-grid</option>
                        <option value="two-columns" ${section.type === 'two-columns' ? 'selected' : ''}>two-columns</option>
                        <option value="formulas" ${section.type === 'formulas' ? 'selected' : ''}>formulas</option>
                        <option value="grid-compare" ${section.type === 'grid-compare' ? 'selected' : ''}>grid-compare</option>
                        <option value="comparison" ${section.type === 'comparison' ? 'selected' : ''}>comparison</option>
                    </select>
                </div>

                <div class="allowed-blocks-info">
                    <strong>Bloques permitidos:</strong> ${allowedBlocks.join(', ')}
                </div>
                
                <div class="form-group">
                    <label>Añadir Bloque</label>
                    <div class="block-type-selector">
                        ${['paragraph', 'quote', 'list', 'chips', 'table', 'code-block', 'info-box', 'card', 'compare-box'].map(type => `
                            <button class="block-type-btn ${allowedBlocks.includes(type) ? '' : 'u-hidden'}" 
                                    onclick="addBlock(${sIndex}, '${type}')">${type}</button>
                        `).join('')}
                    </div>
                </div>

                <div>
                    ${section.blocks.map((block, bIndex) => {
                        const needsLabel = !blocksWithoutLabel.includes(block.type);
                        const hasAudioPrefix = block.content?.startsWith('@_');
                        
                        return `
                            <div class="block-card" data-section-index="${sIndex}" data-block-index="${bIndex}">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; align-items: center;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span class="material-symbols-outlined block-reorder-handle" draggable="false">drag_indicator</span>
                                        <strong style="color: var(--gold);">${block.type}</strong>
                                    </div>
                                    <button class="btn btn-danger btn-danger-sm" onclick="removeBlock(${sIndex}, ${bIndex})">×</button>
                                </div>
                                
                                ${needsLabel ? `
                                <div class="form-group">
                                    <label>Label</label>
                                    <input type="text" value="${block.label || ''}" onchange="updateBlock(${sIndex}, ${bIndex}, 'label', this.value)">
                                </div>
                                ` : ''}

                                ${block.type === 'list' ? renderListEditor(sIndex, bIndex, block) : ''}
                                ${block.type === 'chips' ? renderChipsEditor(sIndex, bIndex, block) : ''}
                                ${block.type === 'table' ? renderTableEditor(sIndex, bIndex, block) : ''}
                                ${block.type === 'code-block' ? renderCodeBlockEditor(sIndex, bIndex, block) : ''}
                                ${block.type === 'info-box' ? renderInfoBoxEditor(sIndex, bIndex, block) : ''}
                                ${block.type === 'paragraph' || block.type === 'quote' ? renderTextEditor(sIndex, bIndex, block, hasAudioPrefix) : ''}
                                ${block.type === 'card' ? renderCardEditor(sIndex, bIndex, block) : ''}
                                ${block.type === 'compare-box' ? renderCompareBoxEditor(sIndex, bIndex, block, hasAudioPrefix) : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');

    setTimeout(() => {
        setupSectionDragAndDrop();
        setupBlockDragAndDrop();
    }, 100);
}

// Funciones auxiliares de renderizado
function renderListEditor(sIndex, bIndex, block) {
    return `
        <div class="form-group">
            <label>Estilo</label>
            <select onchange="updateBlock(${sIndex}, ${bIndex}, 'style', this.value)">
                <option value="">Normal (verb-list)</option>
                <option value="gold" ${block.style === 'gold' ? 'selected' : ''}>Gold (list-gold)</option>
            </select>
        </div>
        <div class="form-group">
            <label>Items (con opción de audio)</label>
            <div id="list-items-${sIndex}-${bIndex}">
                ${(block.items || []).map((item, itemIndex) => {
                    const hasAudio = item?.startsWith?.('@_');
                    const cleanItem = hasAudio ? item.slice(2) : item;
                    return `
                    <div class="list-item-editor" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <input type="text" 
                               value="${cleanItem || ''}" 
                               style="flex: 1; padding: 8px; border: 1px solid var(--border); border-radius: 4px;"
                               onchange="updateListItem(${sIndex}, ${bIndex}, ${itemIndex}, this.value, document.getElementById('check-list-${sIndex}-${bIndex}-${itemIndex}').checked)">
                        <div class="checkbox-wrapper" style="margin: 0; white-space: nowrap;">
                            <input type="checkbox" 
                                   id="check-list-${sIndex}-${bIndex}-${itemIndex}" 
                                   ${hasAudio ? 'checked' : ''}
                                   onchange="updateListItem(${sIndex}, ${bIndex}, ${itemIndex}, document.querySelector('#list-items-${sIndex}-${bIndex} > div:nth-child(${itemIndex+1}) input[type=\\'text\\']').value, this.checked)">
                            <span class="material-symbols-outlined" style="font-size: 16px;">volume_up</span>
                        </div>
                        ${hasAudio ? '<span class="audio-preview-badge">Audio</span>' : ''}
                        <button class="btn btn-danger btn-danger-sm" onclick="removeListItem(${sIndex}, ${bIndex}, ${itemIndex})" style="padding: 4px 8px;">×</button>
                    </div>
                    `;
                }).join('')}
            </div>
            <button class="btn btn-secondary btn-danger-sm" style="margin-top: 5px;" onclick="addListItem(${sIndex}, ${bIndex})">
                + Añadir ítem
            </button>
        </div>
    `;
}

function renderChipsEditor(sIndex, bIndex, block) {
    return `
        <div class="form-group">
            <label>Items (separados por coma)</label>
            <input type="text" value="${block.items?.join(', ') || ''}" onchange="updateBlock(${sIndex}, ${bIndex}, 'items', this.value.split(',').map(i => i.trim()))">
        </div>
    `;
}

function renderTableEditor(sIndex, bIndex, block) {
    return `
        <div class="form-group">
            <label>Label</label>
            <input type="text" value="${block.label || ''}" onchange="updateBlock(${sIndex}, ${bIndex}, 'label', this.value)">
        </div>
        
        <div class="form-group">
            <label>Headers (separados por coma)</label>
            <input type="text" 
                   value="${block.headers?.join(', ') || 'Base, Past, Rule, Otro'}" 
                   onchange="updateTableHeaders(${sIndex}, ${bIndex}, this.value)">
        </div>
        
        <div class="form-group">
            <label>Grupos de la tabla</label>
            <button class="btn btn-secondary btn-danger-sm" onclick="addTableGroup(${sIndex}, ${bIndex})">
                + Añadir Grupo
            </button>
        </div>
        
        <div style="margin-top: 15px;">
            ${(block.rows || []).map((group, groupIndex) => `
                <div class="group-container">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                            <strong style="color: var(--gold);">Grupo ${groupIndex + 1}</strong>
                            <input type="text" 
                                   value="${group.group || ''}" 
                                   placeholder="Nombre del grupo"
                                   style="flex: 1; padding: 8px; border: 1px solid var(--border); border-radius: 4px;"
                                   onchange="updateTableGroup(${sIndex}, ${bIndex}, ${groupIndex}, this.value)">
                        </div>
                        <button class="btn btn-danger btn-danger-sm" onclick="removeTableGroup(${sIndex}, ${bIndex}, ${groupIndex})">
                            <span class="material-symbols-outlined" style="font-size: 14px;">delete</span>
                        </button>
                    </div>
                    
                    <div style="margin-bottom: 10px;">
                        <small style="color: var(--slate);">Filas del grupo:</small>
                    </div>
                    
                    ${(group.items || []).map((row, rowIndex) => `
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; background: white; padding: 8px; border-radius: 6px;">
                            <span style="color: var(--slate); font-size: 12px; min-width: 30px;">F${rowIndex + 1}</span>
                            
                            ${(block.headers || ['Base', 'Past', 'Rule', 'Otro']).map((header, colIndex) => `
                                <input type="text" 
                                       value="${row[colIndex] || ''}" 
                                       placeholder="${header}"
                                       style="flex: 1; padding: 6px; border: 1px solid var(--border); border-radius: 4px;"
                                       onchange="updateTableCell(${sIndex}, ${bIndex}, ${groupIndex}, ${rowIndex}, ${colIndex}, this.value)">
                            `).join('')}
                            
                            <button class="btn btn-danger btn-danger-sm" onclick="removeTableRow(${sIndex}, ${bIndex}, ${groupIndex}, ${rowIndex})" style="padding: 4px 8px;">
                                ×
                            </button>
                        </div>
                    `).join('')}
                    
                    <button class="btn btn-secondary btn-danger-sm" onclick="addTableRow(${sIndex}, ${bIndex}, ${groupIndex})" style="margin-top: 5px;">
                        + Añadir Fila
                    </button>
                </div>
            `).join('')}
        </div>
        
        <small style="color: var(--slate); display: block; margin-top: 10px;">
            💡 Usa @_ para audio en cualquier celda
        </small>
    `;
}

function renderCodeBlockEditor(sIndex, bIndex, block) {
    return `
        <div class="form-group">
            <label>Fórmulas (una por línea)</label>
            <textarea rows="4" onchange="updateBlock(${sIndex}, ${bIndex}, 'items', this.value.split('\\n').filter(line => line.trim() !== ''))">${(block.items || []).join('\n')}</textarea>
        </div>
    `;
}

function renderInfoBoxEditor(sIndex, bIndex, block) {
    return `
        <div class="form-group">
            <label>Contenido</label>
            <textarea rows="2" onchange="updateBlock(${sIndex}, ${bIndex}, 'content', this.value)">${block.content || ''}</textarea>
        </div>
    `;
}

function renderTextEditor(sIndex, bIndex, block, hasAudioPrefix) {
    return `
        <div class="form-group">
            <label>Contenido</label>
            <textarea rows="2" onchange="updateBlock(${sIndex}, ${bIndex}, 'content', this.value)">${block.content || ''}</textarea>
            <div class="checkbox-wrapper" style="margin-top: 5px;">
                <input type="checkbox" id="check-block-${sIndex}-${bIndex}" ${hasAudioPrefix ? 'checked' : ''} onchange="updateBlockContentWithPrefix(${sIndex}, ${bIndex}, this.checked)">
                <span>
                    Añadir prefijo @_ 
                    ${hasAudioPrefix ? '<span class="audio-preview-badge"><span class="material-symbols-outlined" style="font-size:14px;">volume_up</span> Audio</span>' : ''}
                </span>
            </div>
        </div>
    `;
}

function renderCardEditor(sIndex, bIndex, block) {
    return `
        <div class="form-group">
            <label>Contenido</label>
            <input type="text" value="${block.content || ''}" onchange="updateBlock(${sIndex}, ${bIndex}, 'content', this.value)">
        </div>
        <div class="form-group">
            <label>Valor (highlight en dorado)</label>
            <input type="text" value="${block.value || ''}" onchange="updateBlock(${sIndex}, ${bIndex}, 'value', this.value)">
            <div class="checkbox-wrapper" style="margin-top: 5px;">
                <input type="checkbox" id="check-block-value-${sIndex}-${bIndex}" ${block.value?.startsWith('@_') ? 'checked' : ''} onchange="updateBlockValueWithPrefix(${sIndex}, ${bIndex}, this.checked)">
                <span>Añadir prefijo @_ al valor</span>
            </div>
        </div>
    `;
}

function renderCompareBoxEditor(sIndex, bIndex, block, hasAudioPrefix) {
    return `
        <div class="form-group">
            <label>Contenido</label>
            <textarea rows="2" onchange="updateBlock(${sIndex}, ${bIndex}, 'content', this.value)">${block.content || ''}</textarea>
            <div class="checkbox-wrapper" style="margin-top: 5px;">
                <input type="checkbox" id="check-block-${sIndex}-${bIndex}" ${hasAudioPrefix ? 'checked' : ''} onchange="updateBlockContentWithPrefix(${sIndex}, ${bIndex}, this.checked)">
                <span>
                    Añadir prefijo @_ 
                    ${hasAudioPrefix ? '<span class="audio-preview-badge"><span class="material-symbols-outlined" style="font-size:14px;">volume_up</span> Audio</span>' : ''}
                </span>
            </div>
        </div>
        <div class="form-group">
            <label>Descripción</label>
            <input type="text" value="${block.description || ''}" onchange="updateBlock(${sIndex}, ${bIndex}, 'description', this.value)">
        </div>
    `;
}

// =========================
// PREVIEW FUNCTIONS
// =========================
function updatePreview() {
    lessonData.slug = document.getElementById('slug').value || 'lesson';
    lessonData.meta.title = getValueWithPrefix('title', 'check-title');
    lessonData.meta.subtitle = document.getElementById('subtitle').value;
    lessonData.meta.difficulty = document.getElementById('difficulty').value;
    lessonData.meta.icon = document.getElementById('icon').value;
    
    const tagsValue = document.getElementById('tags').value;
    lessonData.meta.tags = tagsValue ? tagsValue.split(',').map(t => t.trim()) : [];

    const badgesValue = document.getElementById('badges').value;
    const addBadgePrefix = document.getElementById('check-badges').checked;
    lessonData.header.badges = badgesValue ? badgesValue.split(',').map(b => {
        b = b.trim();
        return addBadgePrefix && b ? '@_' + b : b;
    }) : [];

    renderPreview();
    document.getElementById('jsonOutput').textContent = JSON.stringify(lessonData, null, 4);
}

function renderPreview() {
    const container = document.getElementById('previewContent');
    
    const titleParts = lessonData.meta.title.split(' ');
    let formattedTitle = lessonData.meta.title;
    if (titleParts.length > 1) {
        const lastWord = titleParts.pop();
        const cleanLastWord = lastWord.startsWith('@_') ? lastWord.slice(2) : lastWord;
        formattedTitle = `${titleParts.join(' ')} <em>${cleanLastWord}</em>`;
    }

    const badgesHtml = lessonData.header.badges.map((badge, i) => `
        <span>${cleanPrefix(badge)}</span>
        ${i < lessonData.header.badges.length - 1 ? '<span class="dot"></span>' : ''}
    `).join('');

    const sectionsHtml = lessonData.sections.map((section, sIndex) => {
        const paddedIndex = String(sIndex + 1).padStart(2, '0');
        const blocksHtml = section.blocks.map(block => renderBlockPreview(block)).join('');
        
        let contentHtml = blocksHtml;
        if (section.type === 'grid-compare') {
            contentHtml = `<div class="grid-2">${blocksHtml}</div>`;
        }

        return `
            <div class="accordion-item" data-section-index="${sIndex}">
                <div class="accordion-header" onclick="toggleAccordion(this)">
                    <div class="accordion-title">
                        <span class="accordion-number serif-title">${paddedIndex}</span>
                        <span>${section.title}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <button class="drag-section-btn" draggable="false" onclick="event.stopPropagation()" title="Arrastrar para reordenar">
                            <span class="material-symbols-outlined">drag_indicator</span>
                        </button>
                        <button class="delete-section-btn" onclick="event.stopPropagation(); removeSection(${sIndex})" title="Eliminar sección">
                            <span class="material-symbols-outlined">delete</span>
                            Eliminar
                        </button>
                        <span class="material-symbols-outlined toggle-icon">add</span>
                    </div>
                </div>
                <div class="accordion-content">
                    <div class="content-block">${contentHtml}</div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="page-header">
            <div class="breadcrumb">
                <a href="#">Home</a>
                <span class="sep">/</span>
                <a href="#">Grammar</a>
                <span class="sep">/</span>
                <span>${cleanPrefix(lessonData.meta.title)}</span>
            </div>
            <div class="page-header__eyebrow">Grammar</div>
            <h1 class="page-title serif-title">${formattedTitle}</h1>
            <p class="page-header__subtitle">${lessonData.meta.subtitle}</p>
            <div class="page-header__meta">
                <span class="difficulty-badge">LEVEL ${lessonData.meta.difficulty}</span>
                ${badgesHtml}
            </div>
        </div>
        
        <div class="accordion">
            ${sectionsHtml}
        </div>
    `;

    setTimeout(() => {
        setupPreviewSectionDragAndDrop();
    }, 100);
}

function renderBlockPreview(block) {
    const createAudioText = (textStr) => {
        if (!textStr || typeof textStr !== 'string') return textStr || '';
        
        if (textStr.startsWith('@_')) {
            const cleanHtml = textStr.slice(2);
            return `<span class="audio-inline-wrapper">${cleanHtml}<span class="material-symbols-outlined audio-btn">volume_up</span></span>`;
        }
        return textStr;
    };

    const cleanContent = (text) => {
        if (!text) return '';
        return createAudioText(text);
    };

    switch(block.type) {
        case 'paragraph':
            return block.label ? `
                <div><div class="section-label">${block.label}</div><p>${cleanContent(block.content)}</p></div>
            ` : `<p>${cleanContent(block.content)}</p>`;
        
        case 'quote':
            return block.label ? `
                <div><div class="section-label">${block.label}</div><div class="quote-box">"${cleanContent(block.content)}"</div></div>
            ` : `<div class="quote-box">"${cleanContent(block.content)}"</div>`;
        
        case 'list':
            const listClass = block.style === 'gold' ? 'list-gold' : 'verb-list';
            const listItems = (block.items || []).map(item => {
                if (typeof item === 'object') {
                    return `<li><span>${item.label} — </span><em>${createAudioText(item.content)}</em></li>`;
                }
                return `<li>${createAudioText(item)}</li>`;
            }).join('');
            return block.label ? `
                <div><div class="section-label">${block.label}</div><ul class="${listClass}">${listItems}</ul></div>
            ` : `<ul class="${listClass}">${listItems}</ul>`;
        
        case 'chips':
            const chipsHtml = (block.items || []).map(chip => `<span class="chip">${cleanContent(chip)}</span>`).join('');
            return block.label ? `
                <div><div class="section-label">${block.label}</div><div class="chip-group">${chipsHtml}</div></div>
            ` : `<div class="chip-group">${chipsHtml}</div>`;
        
        case 'table':
            let tableHtml = '';
            const headers = block.headers || ['Base', 'Past', 'Rule', 'Otro'];
            
            if (block.rows && Array.isArray(block.rows) && block.rows.length > 0) {
                if (typeof block.rows[0] === 'object' && block.rows[0].group !== undefined) {
                    block.rows.forEach((group) => {
                        if (group.group) {
                            tableHtml += `<tr class="table-group-header"><th colspan="${headers.length}">${group.group}</th></tr>`;
                        }
                        
                        if (group.items && Array.isArray(group.items)) {
                            group.items.forEach(row => {
                                tableHtml += '<tr>';
                                headers.forEach((header, colIndex) => {
                                    const cellValue = row[colIndex] || '';
                                    tableHtml += `<td>${createAudioText(cellValue)}</td>`;
                                });
                                tableHtml += '</tr>';
                            });
                        }
                    });
                } else {
                    tableHtml += `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`;
                    block.rows.forEach(row => {
                        if (Array.isArray(row)) {
                            tableHtml += '<tr>';
                            headers.forEach((header, colIndex) => {
                                const cellValue = row[colIndex] || '';
                                tableHtml += `<td>${createAudioText(cellValue)}</td>`;
                            });
                            tableHtml += '</tr>';
                        }
                    });
                    tableHtml += '</tbody>';
                }
            }
            
            return block.label ? `
                <div>
                    <div class="section-label">${block.label}</div>
                    <table class="table">${tableHtml}</table>
                </div>
            ` : `<table class="table">${tableHtml}</table>`;
        
        case 'code-block':
            const codeLines = (block.items || []).map(line => 
                `<span class="code-line">${line}</span>`
            ).join('');
            return `<div class="code-block-container">${codeLines}</div>`;
        
        case 'info-box':
            return `<div class="info-box">${block.content}</div>`;
        
        case 'card':
            return `
                <div>
                    ${block.content}<br/>
                    <strong class="text-gold">${cleanContent(block.value)}</strong>
                </div>
            `;
        
        case 'compare-box':
            return `
                <div class="compare-card">
                    <strong>${block.label}</strong><br/>
                    ${cleanContent(block.content)}
                    ${block.description ? `<div style="font-size: 0.8rem; color: var(--slate); margin-top: 5px;">${block.description}</div>` : ''}
                </div>
            `;
        
        default:
            return '';
    }
}

function toggleAccordion(header) {
    const item = header.parentElement;
    const content = item.querySelector('.accordion-content');
    const icon = item.querySelector('.toggle-icon');
    const isOpen = item.classList.contains('accordion-item--open');

    document.querySelectorAll('.accordion-item').forEach(other => {
        if (other !== item) {
            other.classList.remove('accordion-item--open');
            const otherContent = other.querySelector('.accordion-content');
            if (otherContent) otherContent.style.maxHeight = null;
            const otherIcon = other.querySelector('.toggle-icon');
            if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
        }
    });

    if (!isOpen) {
        item.classList.add('accordion-item--open');
        content.style.maxHeight = content.scrollHeight + 50 + 'px';
        if (icon) icon.style.transform = 'rotate(45deg)';
    } else {
        item.classList.remove('accordion-item--open');
        content.style.maxHeight = null;
        if (icon) icon.style.transform = 'rotate(0deg)';
    }
}

// =========================
// DRAG AND DROP FUNCTIONS
// =========================
function setupSectionDragAndDrop() {
    const sectionCards = document.querySelectorAll('.section-card[data-section-index]');
    
    sectionCards.forEach(card => {
        const dragHandle = card.querySelector('.drag-handle');
        if (dragHandle) {
            dragHandle.setAttribute('draggable', 'true');
            
            dragHandle.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                draggedSectionIndex = parseInt(card.dataset.sectionIndex);
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', draggedSectionIndex);
            });

            dragHandle.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                document.querySelectorAll('.section-card').forEach(c => c.classList.remove('drag-over'));
                draggedSectionIndex = null;
            });
        }

        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (draggedSectionIndex === null) return;
            card.classList.add('drag-over');
        });

        card.addEventListener('dragleave', () => {
            card.classList.remove('drag-over');
        });

        card.addEventListener('drop', (e) => {
            e.preventDefault();
            card.classList.remove('drag-over');
            
            if (draggedSectionIndex === null) return;
            
            const targetIndex = parseInt(card.dataset.sectionIndex);
            
            if (draggedSectionIndex !== targetIndex) {
                const movedSection = lessonData.sections.splice(draggedSectionIndex, 1)[0];
                lessonData.sections.splice(targetIndex, 0, movedSection);
                
                renderSectionsEditor();
                updatePreview();
            }
        });
    });
}

function setupBlockDragAndDrop() {
    const blockCards = document.querySelectorAll('.block-card[data-section-index][data-block-index]');
    
    blockCards.forEach(card => {
        const dragHandle = card.querySelector('.block-reorder-handle');
        if (dragHandle) {
            dragHandle.setAttribute('draggable', 'true');
            
            dragHandle.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                draggedBlockData = {
                    sectionIndex: parseInt(card.dataset.sectionIndex),
                    blockIndex: parseInt(card.dataset.blockIndex)
                };
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            dragHandle.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                document.querySelectorAll('.block-card').forEach(c => c.classList.remove('drag-over'));
                draggedBlockData = null;
            });
        }

        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (draggedBlockData === null) return;
            card.classList.add('drag-over');
        });

        card.addEventListener('dragleave', () => {
            card.classList.remove('drag-over');
        });

        card.addEventListener('drop', (e) => {
            e.preventDefault();
            card.classList.remove('drag-over');
            
            if (draggedBlockData === null) return;
            
            const targetSectionIndex = parseInt(card.dataset.sectionIndex);
            const targetBlockIndex = parseInt(card.dataset.blockIndex);
            
            if (draggedBlockData.sectionIndex !== targetSectionIndex) {
                alert('Solo se pueden reordenar bloques dentro de la misma sección');
                return;
            }
            
            if (draggedBlockData.blockIndex !== targetBlockIndex) {
                const movedBlock = lessonData.sections[draggedBlockData.sectionIndex].blocks.splice(draggedBlockData.blockIndex, 1)[0];
                lessonData.sections[targetSectionIndex].blocks.splice(targetBlockIndex, 0, movedBlock);
                
                renderSectionsEditor();
                updatePreview();
            }
        });
    });
}

function setupPreviewSectionDragAndDrop() {
    const accordionItems = document.querySelectorAll('.accordion-item[data-section-index]');
    
    accordionItems.forEach(item => {
        const dragBtn = item.querySelector('.drag-section-btn');
        if (dragBtn) {
            dragBtn.setAttribute('draggable', 'true');
            
            dragBtn.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                draggedSectionIndex = parseInt(item.dataset.sectionIndex);
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                
                const content = item.querySelector('.accordion-content');
                if (content) content.style.maxHeight = null;
            });

            dragBtn.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('drag-over'));
                draggedSectionIndex = null;
            });
        }

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (draggedSectionIndex === null) return;
            item.classList.add('drag-over');
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over');
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');
            
            if (draggedSectionIndex === null) return;
            
            const targetIndex = parseInt(item.dataset.sectionIndex);
            
            if (draggedSectionIndex !== targetIndex) {
                const movedSection = lessonData.sections.splice(draggedSectionIndex, 1)[0];
                lessonData.sections.splice(targetIndex, 0, movedSection);
                
                renderSectionsEditor();
                updatePreview();
            }
        });
    });
}

// =========================
// UTILITY FUNCTIONS
// =========================
function downloadJSON() {
    const dataStr = JSON.stringify(lessonData, null, 4);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    
    const unixTimestamp = Math.floor(Date.now() / 1000);
    const slug = lessonData.slug || 'lesson';
    link.href = url;
    link.download = `${unixTimestamp}_${slug}.json`;
    link.click();
}

function copyToClipboard() {
    const jsonStr = JSON.stringify(lessonData, null, 4);
    navigator.clipboard.writeText(jsonStr).then(() => {
        alert('JSON copiado al portapapeles');
    });
}

// Exponer funciones globalmente
window.addSection = addSection;
window.removeSection = removeSection;
window.updateSection = updateSection;
window.addBlock = addBlock;
window.removeBlock = removeBlock;
window.updateBlock = updateBlock;
window.updateBlockContentWithPrefix = updateBlockContentWithPrefix;
window.updateBlockValueWithPrefix = updateBlockValueWithPrefix;
window.updateListItem = updateListItem;
window.addListItem = addListItem;
window.removeListItem = removeListItem;
window.addTableGroup = addTableGroup;
window.removeTableGroup = removeTableGroup;
window.updateTableGroup = updateTableGroup;
window.addTableRow = addTableRow;
window.removeTableRow = removeTableRow;
window.updateTableCell = updateTableCell;
window.updateTableHeaders = updateTableHeaders;
window.togglePrefix = togglePrefix;
window.updatePreview = updatePreview;
window.downloadJSON = downloadJSON;
window.copyToClipboard = copyToClipboard;
window.showNewDocumentModal = showNewDocumentModal;
window.closeModal = closeModal;
window.confirmNewDocument = confirmNewDocument;
window.clearLoadedFile = clearLoadedFile;
window.toggleAccordion = toggleAccordion;