document.addEventListener('DOMContentLoaded', () => {
    // Initialize the Editor Module
    Editor.init();
    
    // Tab Switching Logic
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
        });
    });

        // --- New Button Logic (Full Reset) ---
    document.getElementById('btnNew').addEventListener('click', () => {
        // 1. Clear the code editor
        const htmlInput = document.getElementById('htmlInput');
        htmlInput.value = '';
        Editor.updateHighlight();
        Editor.updateLineNumbers();
        
        // 2. Clear the right panel outputs
        document.getElementById('robloxTree').innerHTML = '<p class="placeholder-text">Click \'Convert\' to map to Roblox</p>';
        document.getElementById('imageList').innerHTML = '<p class="placeholder-text">No images found</p>';
        document.getElementById('assetIdInput').value = '';
        
        // 3. Disable export buttons
        document.getElementById('btnCopyXml').disabled = true;
        document.getElementById('btnDownload').disabled = true;
        
        // 4. Clear global state variables
        window.generatedXML = null;
        window.robloxTree = null;
        
        // 5. Reset status bar
        Editor.updateStatus('Ready', 'ready');
    });

    // --- Convert Button Logic ---
    document.getElementById('btnConvert').addEventListener('click', () => {
        const htmlInput = document.getElementById('htmlInput');
        if (!htmlInput.value.trim()) {
            Editor.updateStatus('Error: No HTML provided', 'error');
            return;
        }
        
        Editor.updateStatus('Rendering and Tracing Layout...', 'processing');
        
        try {
            // 1. Use the DOM Exporter to trace the actual rendered layout
            const robloxTree = DOMExporter.generate(htmlInput.value);
            
            // 2. Render the tree to the UI Explorer
            HTMLMapper.renderRobloxTree(robloxTree, document.getElementById('robloxTree'));
            
            // 3. Generate XML
            const xml = XMLGenerator.generate(robloxTree);
            window.generatedXML = xml;
            window.robloxTree = robloxTree;
            
            // Enable export buttons
            document.getElementById('btnCopyXml').disabled = false;
            document.getElementById('btnDownload').disabled = false;
            
            Editor.updateStatus('Layout traced successfully. Ready to export.', 'ready');
            
            // Update image list
            if (typeof renderImageList === 'function') {
                setTimeout(renderImageList, 100);
            }
        } catch (e) {
            Editor.updateStatus('Error tracing layout: ' + e.message, 'error');
            console.error(e);
        }
    });

    // --- Copy XML Logic ---
    // Clone node to guarantee only ONE listener exists (fixes double-trigger bugs)
    const btnCopy = document.getElementById('btnCopyXml');
    const newBtnCopy = btnCopy.cloneNode(true);
    btnCopy.parentNode.replaceChild(newBtnCopy, btnCopy);
    
    newBtnCopy.addEventListener('click', () => {
        if (window.generatedXML) {
            navigator.clipboard.writeText(window.generatedXML).then(() => {
                Editor.updateStatus('XML copied to clipboard!', 'ready');
            }).catch(() => {
                Editor.updateStatus('Failed to copy XML', 'error');
            });
        }
    });

    // --- Download Logic ---
    // Clone node to guarantee only ONE listener exists (fixes double-download bug)
    const btnDownload = document.getElementById('btnDownload');
    const newBtnDownload = btnDownload.cloneNode(true);
    btnDownload.parentNode.replaceChild(newBtnDownload, btnDownload);

    newBtnDownload.addEventListener('click', () => {
        if (window.generatedXML) {
            const blob = new Blob([window.generatedXML], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Web2Roblox_Gui.rbxmx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            Editor.updateStatus('Downloaded Web2Roblox_Gui.rbxmx', 'ready');
        }
    });

    // --- Image Asset ID Converter ---
    let selectedImageNode = null;
    
    const btnApply = document.getElementById('btnApplyAssetId');
    const newBtnApply = btnApply.cloneNode(true);
    btnApply.parentNode.replaceChild(newBtnApply, btnApply);

    newBtnApply.addEventListener('click', () => {
        const assetId = document.getElementById('assetIdInput').value.trim();
        if (assetId && selectedImageNode) {
            selectedImageNode.properties.Image = assetId;
            selectedImageNode.properties.ImageTransparency = 0;
            Editor.updateStatus('Image asset ID applied', 'ready');
            
            // Re-generate XML
            const xml = XMLGenerator.generate(window.robloxTree);
            window.generatedXML = xml;
            
            // Refresh image list
            if (typeof renderImageList === 'function') renderImageList();
        }
    });
    
    function renderImageList() {
        const container = document.getElementById('imageList');
        if(!container) return;
        container.innerHTML = '';
        
        const images = [];
        function findImages(nodes) {
            for (let node of nodes) {
                if (node.className === 'ImageLabel' && node.properties.Image) {
                    images.push(node);
                }
                if (node.children) findImages(node.children);
            }
        }
        
        if (window.robloxTree) {
            findImages(window.robloxTree);
        }
        
        if (images.length === 0) {
            container.innerHTML = '<p class="placeholder-text">No images found</p>';
            return;
        }
        
        images.forEach(img => {
            const div = document.createElement('div');
            div.className = 'image-item';
            const isExternal = img.name.includes('[External]') || img.name.includes('[ReplaceWithAssetID]');
            div.innerHTML = `
                <span class="image-item-name">${img.name}</span>
                <span class="image-item-status">${isExternal ? '⚠️ External' : '✓ OK'}</span>
            `;
            div.style.cursor = 'pointer';
            div.addEventListener('click', () => {
                selectedImageNode = img;
                document.getElementById('assetIdInput').value = img.properties.Image;
                Editor.updateStatus(`Selected: ${img.name}`, 'ready');
            });
            container.appendChild(div);
        });
    }
});