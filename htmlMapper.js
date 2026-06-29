const HTMLMapper = {
    // Mapping rules based on project requirements + sensible defaults
    tagMap: {
        // Containers -> Frame
        'div': 'Frame', 'section': 'Frame', 'article': 'Frame', 'header': 'Frame', 
        'footer': 'Frame', 'main': 'Frame', 'nav': 'Frame', 'aside': 'Frame', 
        'ul': 'Frame', 'ol': 'Frame', 'li': 'Frame', 'form': 'Frame', 'fieldset': 'Frame',
        
        // Interactive -> TextButton
        'button': 'TextButton', 
        
        // Text -> TextLabel
        'span': 'TextLabel', 'p': 'TextLabel', 'label': 'TextLabel', 
        'h1': 'TextLabel', 'h2': 'TextLabel', 'h3': 'TextLabel', 
        'h4': 'TextLabel', 'h5': 'TextLabel', 'h6': 'TextLabel',
        
        // Media -> ImageLabel
        'img': 'ImageLabel',
        
        // Inputs -> TextBox
        'input': 'TextBox', 'textarea': 'TextBox'
    },

    nameCounters: {},

    /**
     * Generates a unique, readable name for the Roblox instance.
     * Prioritizes ID, then first Class, then Tag name.
     */
    generateUniqueName: function(tag, classes, id) {
        let baseName = tag;
        if (id) baseName = id;
        else if (classes && classes.length > 0) baseName = classes[0];
        
        // Capitalize first letter for Roblox convention
        baseName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
        
        if (!this.nameCounters[baseName]) {
            this.nameCounters[baseName] = 1;
            return baseName;
        }
        
        this.nameCounters[baseName]++;
        return baseName + this.nameCounters[baseName];
    },

    /**
     * Recursively maps an HTML node to a Roblox instance structure.
     */
    mapNode: function(node) {
        const tag = node.tag;
        let robloxClass = this.tagMap[tag] || 'Frame'; // Default unknown tags to Frame

        // Special heuristic: <a> tags with href are buttons, without are just text
        if (tag === 'a' && !node.attributes.href) {
            robloxClass = 'TextLabel';
        }

        const instance = {
            className: robloxClass,
            name: this.generateUniqueName(tag, node.class, node.id),
            properties: {},
            children: []
        };

        // Extract basic content properties based on the Roblox class
        if (robloxClass === 'TextLabel' || robloxClass === 'TextButton') {
            instance.properties.Text = node.text || '';
        } else if (robloxClass === 'ImageLabel') {
            // Use a default Roblox placeholder if src is missing
            instance.properties.Image = node.attributes.src || 'rbxasset://textures/ui/common/placeholder.png';
        } else if (robloxClass === 'TextBox') {
            instance.properties.PlaceholderText = node.attributes.placeholder || '';
            instance.properties.Text = node.attributes.value || node.text || '';
        }

        // Pass through computed styles for Step 6 (CSS Mapping)
        if (node.computedStyle) {
            instance.computedStyle = node.computedStyle;
        }

        // Recursively map children
        if (node.children && node.children.length > 0) {
            for (let child of node.children) {
                const mappedChild = this.mapNode(child);
                if (mappedChild) {
                    instance.children.push(mappedChild);
                }
            }
        }

        return instance;
    },

    /**
     * Entry point to map the entire HTML tree.
     */
    mapTree: function(tree) {
        this.nameCounters = {}; // Reset counters for each conversion
        const robloxTree = [];
        
        for (let node of tree) {
            const mapped = this.mapNode(node);
            if (mapped) robloxTree.push(mapped);
        }
        
        return robloxTree;
    },

    /**
     * Renders the Roblox instance tree into the UI Explorer panel.
     */
        /**
     * Renders the Roblox instance tree into the UI Explorer panel.
     * UPDATED: Now shows child UI components and mapped properties.
     */
    renderRobloxTree: function(tree, container) {
        container.innerHTML = '';
        if (!tree || tree.length === 0) {
            container.innerHTML = '<p class="placeholder-text">No Roblox instances generated</p>';
            return;
        }
        
        function renderNodes(nodes, parentEl) {
            nodes.forEach(node => {
                const div = document.createElement('div');
                div.className = 'tree-node';
                
                // Assign icons based on Roblox class
                let icon = '📦'; // Frame
                if (node.className === 'TextButton') icon = '🔘';
                else if (node.className === 'TextLabel') icon = '📝';
                else if (node.className === 'ImageLabel') icon = '🖼️';
                else if (node.className === 'TextBox') icon = '⌨️';
                else if (node.className === 'ScrollingFrame') icon = '📜';
                else if (node.className === 'UICorner') icon = '⚪';
                else if (node.className === 'UIStroke') icon = '⭕';
                else if (node.className === 'UIPadding') icon = '↔️';
                else if (node.className === 'UIListLayout') icon = '📋';
                else if (node.className === 'UIGridLayout') icon = '🔲';
                
                // Build properties summary
                let propsStr = '';
                if (node.properties) {
                    const keys = Object.keys(node.properties);
                    if (keys.length > 0) {
                        propsStr = ` <span class="tree-props">[${keys.join(', ')}]</span>`;
                    }
                }
                
                div.innerHTML = `
                    <span class="tree-icon">${icon}</span>
                    <span class="tree-class">${node.className}</span>
                    <span class="tree-id">[${node.name}]</span>
                    ${propsStr}
                `;
                parentEl.appendChild(div);
                
                if (node.children && node.children.length > 0) {
                    const childWrapper = document.createElement('div');
                    childWrapper.className = 'tree-children';
                    renderNodes(node.children, childWrapper);
                    parentEl.appendChild(childWrapper);
                }
            });
        }
        
        renderNodes(tree, container);
    }
};