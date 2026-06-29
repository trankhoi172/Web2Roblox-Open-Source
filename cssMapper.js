const CSSMapper = {
    /**
     * Entry point to map CSS properties to the entire Roblox tree.
     */
    mapTree: function(tree) {
        if (!tree) return;
        for (let node of tree) {
            this.mapNode(node);
        }
    },

    mapNode: function(node) {
        if (!node.computedStyle) node.computedStyle = {};
        const style = node.computedStyle;
        
        if (!node.properties) node.properties = {};
        if (!node.children) node.children = [];

        // --- 1. Direct Properties ---
        
        const bgColor = style['background-color'] || style['background'];
        if (bgColor) {
            const c = this.parseColor(bgColor);
            if (c) node.properties.BackgroundColor3 = c;
        }

        if (style['color']) {
            const c = this.parseColor(style['color']);
            if (c) node.properties.TextColor3 = c;
        }

        // Size with smart defaults
        let sizeX = { scale: 0, offset: 100 }; // Default to 100px if not set
        let sizeY = { scale: 0, offset: 100 };
        
        if (style['width']) {
            const w = this.parseSize(style['width']);
            if (w) sizeX = w;
        }
        if (style['height']) {
            const h = this.parseSize(style['height']);
            if (h) sizeY = h;
        }
        
        node.properties.Size = {
            scaleX: sizeX.scale, offsetX: sizeX.offset,
            scaleY: sizeY.scale, offsetY: sizeY.offset
        };

        // Opacity
        if (style['opacity']) {
            const op = parseFloat(style['opacity']);
            node.properties.BackgroundTransparency = 1 - op;
            if (node.className === 'TextLabel' || node.className === 'TextButton') {
                node.properties.TextTransparency = 1 - op;
            }
        }

        // --- 1.5 Visual Fidelity ---
        
        if (!bgColor) {
            node.properties.BackgroundTransparency = 1;
        } else {
            if (!style['opacity']) node.properties.BackgroundTransparency = 0;
        }

        const guiClasses = ['Frame', 'TextLabel', 'TextButton', 'ImageLabel', 'TextBox', 'ScrollingFrame'];
        if (guiClasses.includes(node.className)) {
            node.properties.BorderSizePixel = 0;
        }

        // Text Properties
        if (['TextLabel', 'TextButton', 'TextBox'].includes(node.className)) {
            if (style['font-size']) {
                const fs = parseFloat(style['font-size']);
                if (!isNaN(fs)) node.properties.TextSize = Math.min(fs, 100);
            }
            if (style['text-align']) {
                const align = style['text-align'];
                if (align === 'center') node.properties.TextXAlignment = 'Center';
                else if (align === 'right') node.properties.TextXAlignment = 'Right';
                else node.properties.TextXAlignment = 'Left';
            }
            if (style['font-weight'] === 'bold' || parseInt(style['font-weight']) >= 700) {
                node.properties.Font = 'GothamBold';
            }
        }

        // --- 2. Class Overrides ---
        
        if (style['overflow'] === 'auto' || style['overflow'] === 'scroll') {
            if (node.className === 'Frame') {
                node.className = 'ScrollingFrame';
                node.properties.CanvasSize = { scaleX: 0, offsetX: 0, scaleY: 0, offsetY: 0 };
                node.properties.ScrollBarThickness = 4;
            }
        }

        // --- 3. Child UI Components ---
        
        if (style['border-radius']) {
            const br = this.parseSize(style['border-radius']);
            if (br) {
                node.children.push({
                    className: 'UICorner',
                    name: 'UICorner',
                    properties: { CornerRadius: br },
                    children: []
                });
            }
        }

        if (style['box-shadow'] && style['box-shadow'] !== 'none') {
            const shadow = this.parseBoxShadow(style['box-shadow']);
            if (shadow && shadow.color) {
                node.children.push({
                    className: 'UIStroke',
                    name: 'UIStroke',
                    properties: {
                        Thickness: shadow.thickness,
                        Color: shadow.color,
                        Transparency: 0.5
                    },
                    children: []
                });
            }
        }

        if (style['padding']) {
            const p = this.parseSize(style['padding']);
            if (p) {
                node.children.push({
                    className: 'UIPadding',
                    name: 'UIPadding',
                    properties: {
                        PaddingTop: p, PaddingBottom: p,
                        PaddingLeft: p, PaddingRight: p
                    },
                    children: []
                });
            }
        }

                // display: flex -> UIListLayout
        if (style['display'] === 'flex') {
            node._isFlexContainer = true; // <-- ADD THIS
            node._flexDirection = style['flex-direction'] || 'row'; // <-- ADD THIS
            
            const layout = {
                className: 'UIListLayout',
                name: 'UIListLayout',
                properties: {
                    FillDirection: 'Y',
                    Padding: { scale: 0, offset: 0 },
                    HorizontalAlignment: 'Left',
                    VerticalAlignment: 'Top',
                    SortOrder: 'LayoutOrder'
                },
                children: []
            };
            
            if (style['flex-direction'] === 'row') layout.properties.FillDirection = 'X';
            if (style['flex-direction'] === 'row-reverse') layout.properties.FillDirection = 'X';
            
            if (style['gap']) {
                const g = this.parseSize(style['gap']);
                if (g) layout.properties.Padding = g;
            }
            
            if (style['justify-content']) {
                layout.properties.HorizontalAlignment = this.mapAlignment(style['justify-content'], 'H');
            }
            if (style['align-items']) {
                layout.properties.VerticalAlignment = this.mapAlignment(style['align-items'], 'V');
            }
            
            node.children.push(layout);
        }

                // Check for flex: 1
        if (style['flex'] === '1' || style['flex-grow'] === '1') {
            node._hasFlexGrow = true;
        }
        
        // display: grid -> UIGridLayout
        else if (style['display'] === 'grid') {
            const layout = {
                className: 'UIGridLayout',
                name: 'UIGridLayout',
                properties: {
                    CellPadding: { scale: 0, offset: 10 },
                    CellSize: { scaleX: 0, offsetX: 150, scaleY: 0, offsetY: 150 },
                    FillDirection: 'X',
                    SortOrder: 'LayoutOrder'
                },
                children: []
            };
            
            if (style['gap']) {
                const g = this.parseSize(style['gap']);
                if (g) layout.properties.CellPadding = g;
            }
            
            node.children.push(layout);
        }

        // --- 4. Image Handling ---
        if (node.className === 'ImageLabel' && node.properties.Image) {
            const imgUrl = node.properties.Image;
            if (imgUrl.startsWith('http') && !imgUrl.includes('roblox.com') && !imgUrl.includes('rbxasset')) {
                node.properties.Image = 'rbxasset://textures/ui/common/placeholder.png';
                node.properties.ImageTransparency = 0.5;
                node.name = node.name + '_[ExternalImage]';
            }
        }

        // Recurse through children
        for (let child of node.children) {
            this.mapNode(child);
        }
    },

    // --- Helper Functions ---

    parseColor: function(str) {
        if (!str) return null;
        str = str.trim();
        if (str.includes('gradient')) return null; // Roblox uses UIGradient for gradients
        
        if (str.startsWith('#')) {
            let hex = str.slice(1);
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
        
        if (str.startsWith('rgb')) {
            const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (match) {
                return {
                    r: parseInt(match[1]),
                    g: parseInt(match[2]),
                    b: parseInt(match[3]),
                    a: match[4] !== undefined ? parseFloat(match[4]) : 1
                };
            }
        }
        
        const named = { white: {r:255,g:255,b:255,a:1}, black: {r:0,g:0,b:0,a:1}, transparent: {r:0,g:0,b:0,a:0}, red: {r:255,g:0,b:0,a:1}, blue: {r:0,g:0,b:255,a:1} };
        return named[str] || null;
    },

    parseSize: function(str) {
        if (!str || str === 'auto') return null;
        str = str.trim();
        if (str.endsWith('%')) return { scale: parseFloat(str) / 100, offset: 0 };
        if (str.endsWith('px')) return { scale: 0, offset: parseFloat(str) };
        return { scale: 0, offset: parseFloat(str) };
    },

    parseBoxShadow: function(str) {
        if (!str || str === 'none') return null;
        let colorStr = '#000000';
        let thickness = 2;
        
        const rgbMatch = str.match(/rgba?\([^)]+\)/);
        if (rgbMatch) {
            colorStr = rgbMatch[0];
        } else {
            const hexMatch = str.match(/#[0-9a-fA-F]{3,6}/);
            if (hexMatch) colorStr = hexMatch[0];
        }
        
        const nums = str.match(/-?\d+(\.\d+)?px/g);
        if (nums && nums.length >= 3) {
            thickness = parseFloat(nums[2]); // Use blur radius as thickness
        } else if (nums && nums.length > 0) {
            thickness = parseFloat(nums[0]);
        }
        
        return { thickness, color: this.parseColor(colorStr) };
    },

    mapAlignment: function(val, axis) {
        const mapH = { 'flex-start': 'Left', 'center': 'Center', 'flex-end': 'Right', 'space-between': 'Center', 'space-around': 'Center' };
        const mapV = { 'flex-start': 'Top', 'center': 'Center', 'flex-end': 'Bottom', 'stretch': 'Center' };
        return axis === 'H' ? (mapH[val] || 'Left') : (mapV[val] || 'Top');
    },

        /**
     * Post-processes the tree to fix flex child sizing.
     * HTML flex: 1 means "share space equally", but Roblox needs explicit sizes.
     */
    fixFlexChildSizing: function(tree) {
        if (!tree) return;
        
        function processNode(node) {
            if (node._hasFlexLayout && node.children) {
                // Count non-layout children (exclude UIListLayout, UIPadding, etc.)
                const contentChildren = node.children.filter(child => 
                    !['UIListLayout', 'UIGridLayout', 'UIPadding', 'UICorner', 'UIStroke'].includes(child.className)
                );
                
                if (contentChildren.length > 0) {
                    const isRow = node._flexDirection === 'row';
                    
                    // Check if children have explicit sizes
                    const childrenWithExplicitSize = contentChildren.filter(child => 
                        child.properties.Size && 
                        (child.properties.Size.scaleX > 0 || child.properties.Size.offsetX > 100)
                    );
                    
                    // If most children don't have explicit sizes, distribute space
                    if (childrenWithExplicitSize.length < contentChildren.length / 2) {
                        const sharePerChild = 1 / contentChildren.length;
                        
                        contentChildren.forEach((child, index) => {
                            if (isRow) {
                                // Row layout: share width equally
                                child.properties.Size = {
                                    scaleX: sharePerChild,
                                    offsetX: 0,
                                    scaleY: child.properties.Size.scaleY || 1,
                                    offsetY: child.properties.Size.offsetY || 0
                                };
                            } else {
                                // Column layout: full width, share height
                                child.properties.Size = {
                                    scaleX: 1,
                                    offsetX: 0,
                                    scaleY: sharePerChild,
                                    offsetY: 0
                                };
                            }
                            child.properties.LayoutOrder = index;
                        });
                    }
                }
            }
            
            // Recurse
            if (node.children) {
                node.children.forEach(child => processNode(child));
            }
        }
        
        tree.forEach(node => processNode(node));
    },
        /**
     * Post-processor to fix Flexbox layouts.
     * Roblox UIListLayout doesn't support flex: 1, so we calculate sizes manually.
     */
    resolveFlexbox: function(tree) {
        if (!tree) return;

        function processNode(node) {
            // Check if this node is a flex container
            if (node._isFlexContainer && node.children) {
                // Get only the visual children (ignore UIListLayout, UIPadding, etc.)
                const visualChildren = node.children.filter(child => 
                    !['UIListLayout', 'UIGridLayout', 'UIPadding', 'UICorner', 'UIStroke'].includes(child.className)
                );

                if (visualChildren.length > 0) {
                    const isRow = node._flexDirection === 'row';
                    const count = visualChildren.length;
                    
                    // Calculate gap offset if present
                    let gapOffset = 0;
                    const listLayout = node.children.find(c => c.className === 'UIListLayout');
                    if (listLayout && listLayout.properties.Padding) {
                        gapOffset = listLayout.properties.Padding.offset || 0;
                    }

                    visualChildren.forEach((child, index) => {
                        // If the child has flex: 1 or flex-grow > 0, or no explicit size
                        const hasFlex = child._hasFlexGrow || !child.properties.Size;
                        
                        if (hasFlex) {
                            if (isRow) {
                                // Row: Share width equally, keep height
                                const scalePerChild = 1 / count;
                                // Subtract gap padding from scale
                                const gapScale = (gapOffset * (count - 1)) / (count * 1000); // rough approximation
                                
                                child.properties.Size = {
                                    scaleX: Math.max(0.01, scalePerChild - gapScale),
                                    offsetX: 0,
                                    scaleY: child.properties.Size ? child.properties.Size.scaleY : 0,
                                    offsetY: child.properties.Size ? child.properties.Size.offsetY : 100
                                };
                            } else {
                                // Column: Full width, share height
                                const scalePerChild = 1 / count;
                                child.properties.Size = {
                                    scaleX: 1,
                                    offsetX: 0,
                                    scaleY: Math.max(0.01, scalePerChild),
                                    offsetY: 0
                                };
                            }
                            child.properties.LayoutOrder = index;
                        }
                    });
                }
            }

            // Recurse
            if (node.children) {
                node.children.forEach(child => processNode(child));
            }
        }

        tree.forEach(node => processNode(node));
    }
};