const DOMExporter = {
    // Reference resolution for calculating Scale values
    REF_WIDTH: 1920,
    REF_HEIGHT: 1080,

    /**
     * Main entry point. Takes raw HTML string, renders it, and returns a Roblox tree.
     */
    generate: function(htmlString) {
        const container = document.getElementById('render-target');
        if (!container) {
            console.error("Render target container not found in HTML");
            return [];
        }

        // 1. Inject HTML into hidden container
        container.innerHTML = htmlString;

        // 2. Wait a frame for styles to apply
        // Note: Images might not be fully loaded, but layout usually is.
        const tree = [];
        
        // 3. Walk the direct children of the container (the root elements)
        for (let child of container.children) {
            const node = this.processElement(child, container);
            if (node) tree.push(node);
        }

        // 4. Cleanup
        container.innerHTML = '';

        return tree;
    },

    /**
     * Recursively processes a DOM element into a Roblox instance structure.
     */
    processElement: function(el, parentEl) {
        const tag = el.tagName.toLowerCase();
        
        // Skip non-visual elements
        if (['script', 'style', 'meta', 'link', 'head'].includes(tag)) return null;

        // Get Computed Styles early for class determination
        const style = window.getComputedStyle(el);

        // 1. Determine Roblox Class using centralized intelligent mapping
        const className = this.determineRobloxClass(el, style);

        // 2. Get Computed Layout (The Source of Truth - UNCHANGED)
        const rect = el.getBoundingClientRect();
        const parentRect = parentEl.getBoundingClientRect();

        // Prevent processing hidden elements
        if (rect.width <= 0 || rect.height <= 0) return null;

        // 3. Calculate Position & Size RELATIVE TO PARENT (UNCHANGED)
        const relX = rect.left - parentRect.left;
        const relY = rect.top - parentRect.top;
        
        const scaleX = relX / parentRect.width;
        const scaleY = relY / parentRect.height;
        const sizeX = rect.width / parentRect.width;
        const sizeY = rect.height / parentRect.height;

        const node = {
            className: className,
            name: el.id || (el.className ? el.className.split(' ')[0] : tag) || 'Element',
            properties: {
                Position: { scaleX: scaleX, offsetX: 0, scaleY: scaleY, offsetY: 0 },
                Size: { scaleX: sizeX, offsetX: 0, scaleY: sizeY, offsetY: 0 },
                BackgroundTransparency: 1 // Default to transparent
            },
            children: []
        };

        // Special handling for SVGs (Lucide Icons)
        if (tag === 'svg') {
            node.properties.Image = 'rbxasset://textures/ui/common/placeholder.png';
            node.name = 'Icon_[ReplaceWithAssetID]';
            node.properties.BackgroundTransparency = 1; 
        }

        // 4. Map Visual Styles and Text
        this.mapStyles(node, el, style, className);

        // 5. Recurse for children
        for (let child of el.children) {
            const childNode = this.processElement(child, el);
            if (childNode) node.children.push(childNode);
        }

        return node;
    },

        /**
     * Centralized function to determine the Roblox UI class for an HTML element.
     * Uses a priority-based heuristic system.
     */
    determineRobloxClass: function(el, style) {
        const tag = el.tagName.toLowerCase();
        
        // Priority 1: Tag is button
        if (tag === 'button') return 'TextButton';
        
        // Priority 2: Role is button
        if (el.getAttribute('role') === 'button') return 'TextButton';
        
        // Priority 3: Has click handlers
        if (el.onclick || el.getAttribute('onclick')) return 'TextButton';
        
        // Priority 4: Computed CSS has cursor: pointer
        if (style && style.cursor === 'pointer') return 'TextButton';
        
        // Priority 5: Class name contains keywords
        const className = el.className || '';
        if (typeof className === 'string' && (className.includes('btn') || className.includes('button'))) {
            return 'TextButton';
        }
        
        // Priority 6: Input/Textarea
        if (tag === 'input' || tag === 'textarea') return 'TextBox';
        
        // Priority 7: Image
        if (tag === 'img' || tag === 'svg') return 'ImageLabel';
        
        // Priority 8: Text elements
        if (['p', 'span', 'label', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) return 'TextLabel';
        
        // Priority 9: Smart heuristic for text-only divs (crucial for layouts like the Egg Hatch menu)
        let hasDirectText = false;
        for (let child of el.childNodes) {
            if (child.nodeType === Node.TEXT_NODE && child.textContent.trim().length > 0) {
                hasDirectText = true;
                break;
            }
        }
        if (el.children.length === 0 && hasDirectText) {
            return 'TextLabel';
        }
        
        // Default
        return 'Frame';
    },

    mapStyles: function(node, el, style, className) {
        // --- Background Color ---
        const bg = style.backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
            const color = this.parseColor(bg);
            if (color) {
                node.properties.BackgroundColor3 = color;
                node.properties.BackgroundTransparency = color.a < 1 ? 1 - color.a : 0;
            }
        }

        // --- Text Properties & Content ---
        if (['TextLabel', 'TextButton', 'TextBox'].includes(className)) {
            // Clean text extraction: grabs direct text nodes first to avoid SVG noise
            let text = '';
            for (let child of el.childNodes) {
                if (child.nodeType === Node.TEXT_NODE) {
                    text += child.textContent;
                }
            }
            // Fallback to innerText if no direct text nodes (e.g. nested spans)
            if (!text.trim()) {
                text = el.innerText || el.textContent || '';
                // Remove any text that belongs to child SVGs
                const svgs = el.querySelectorAll('svg');
                svgs.forEach(svg => { text = text.replace(svg.innerText, ''); });
            }
            text = text.trim();

            if (className === 'TextBox') {
                node.properties.PlaceholderText = el.placeholder || text;
                node.properties.Text = el.value || '';
            } else {
                node.properties.Text = text;
            }

            // Computed Text Styles
            const color = this.parseColor(style.color);
            if (color) node.properties.TextColor3 = color;

            const fontSize = parseFloat(style.fontSize);
            if (fontSize) node.properties.TextSize = fontSize;
            
            if (style.fontWeight === 'bold' || parseInt(style.fontWeight) >= 700) {
                node.properties.Font = 'GothamBold';
            }
            
            // Text Alignment
            if (style.textAlign === 'center') node.properties.TextXAlignment = 'Center';
            else if (style.textAlign === 'right') node.properties.TextXAlignment = 'Right';
            else node.properties.TextXAlignment = 'Left';
            
            // Text Opacity
            const opacity = parseFloat(style.opacity);
            if (!isNaN(opacity) && opacity < 1) {
                node.properties.TextTransparency = 1 - opacity;
            }
        }

        // --- Image (for <img> tags only) ---
        if (className === 'ImageLabel' && el.tagName.toLowerCase() !== 'svg') {
            let src = el.src || el.getAttribute('src');
            if (src && src.startsWith('http')) {
                node.properties.Image = 'rbxasset://textures/ui/common/placeholder.png';
                node.name += '_[External]';
            } else if (src) {
                node.properties.Image = src;
            }
        }

        // --- Border Radius (UICorner) ---
        const radius = parseFloat(style.borderRadius);
        if (radius > 0) {
            node.children.push({
                className: 'UICorner',
                name: 'UICorner',
                properties: { CornerRadius: { scale: 0, offset: radius } },
                children: []
            });
        }
        
        // --- Border (UIStroke) ---
        const borderWidth = parseFloat(style.borderWidth);
        if (borderWidth > 0) {
             const borderColor = this.parseColor(style.borderColor);
             if (borderColor) {
                 node.children.push({
                    className: 'UIStroke',
                    name: 'UIStroke',
                    properties: { 
                        Thickness: borderWidth,
                        Color: borderColor
                    },
                    children: []
                });
             }
        }
    },

    parseColor: function(cssColor) {
        if (!cssColor) return null;
        
        // Handle rgba(r, g, b, a)
        const rgbaMatch = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (rgbaMatch) {
            return {
                r: parseInt(rgbaMatch[1]),
                g: parseInt(rgbaMatch[2]),
                b: parseInt(rgbaMatch[3]),
                a: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1
            };
        }
        
        // Handle hex
        if (cssColor.startsWith('#')) {
            let hex = cssColor.slice(1);
            if (hex.length === 3) hex = hex.split('').map(c => c+c).join('');
            if (hex.length >= 6) {
                return {
                    r: parseInt(hex.slice(0,2), 16),
                    g: parseInt(hex.slice(2,4), 16),
                    b: parseInt(hex.slice(4,6), 16),
                    a: 1
                };
            }
        }
        return null;
    }
};