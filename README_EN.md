# 🚀 The Best Novel Writing Software You'll Ever Use

[English](README_EN.md) | [中文](README.md)

> 💡 As a novel creator, have you ever been frustrated by the lack of suitable writing tools? Today, I'd like to introduce **51mazi**, a powerful and beautifully designed desktop novel writing software. Built with modern technology, this software provides comprehensive support for novel creators, from outline planning to content creation.
>
> 💡 **If this project helps you, please give it a Star! Please give it a Star! Please give it a Star!**

## 🎯 Software Overview

**51mazi** is a desktop novel writing software developed with Electron + Vue 3 technology stack, specifically designed for novel creators. It not only provides a professional writing environment but also integrates creative assistance tools such as map design, relationship graphs, character profiles, and AI-assisted creation, making novel writing more efficient and enjoyable.

![Software Homepage](https://raw.githubusercontent.com/xiaoshengxianjun/51mazi/main/static/home.png)

*Software Homepage Interface - Clean and Beautiful Bookshelf Management Interface*

## ✨ Core Features

### 📚 Multi-Book Management System

The software uses a bookshelf-style management system, supporting the creation, editing, and deletion of multiple books. Each book has an independent data directory structure, ensuring data security and independence.

- **Bookshelf Password Protection**: Support for setting password protection for the entire bookshelf, requiring password verification on startup to ensure creative content security
  - Support for setting, modifying, and canceling bookshelf passwords
  - Password hint functionality to help remember passwords
  - 8-16 character alphanumeric combination, secure and reliable
- **Book Password Protection**: Support for setting password protection for individual books (optional, 4-8 character alphanumeric)
- **Smart Naming**: Automatically creates default chapters, supports book name length restrictions
- **Data Isolation**: Each book is stored independently without interference
- **Cover Management**: Choose a local cover image or customize cover color
- **AI Cover Generation**: Integrated Tongyi Wanxiang to generate novel covers from title/pen name/prompt, then apply in one click

#### 🤖 AI Cover Generation

![AI cover example](https://raw.githubusercontent.com/xiaoshengxianjun/51mazi/main/static/ai_cover.png)

In the **Create/Edit Book** drawer, click **AI Cover Generation** to generate multiple candidate covers based on the title and pen name. Pick one, click **Confirm Use**, then save the book — the cover will appear on the bookshelf.

### 🎨 AI Character Image Generation

![AI character image example](https://raw.githubusercontent.com/xiaoshengxianjun/51mazi/main/static/ai_character.png)

In the **Character Profile** edit drawer, click **AI Generate Character Image** to choose an art style (e.g. anime, Ghibli-style, photorealistic), fill in appearance description and pose. The app generates multiple vertical full-body character images; pick one and click **Confirm Use** to add it to that character’s image list. You can save multiple images per character in different styles or poses.

### ✍️ Professional Writing Experience

![Editor Interface](https://raw.githubusercontent.com/xiaoshengxianjun/51mazi/main/static/editor.png)

*Professional Writing Editor Interface - Rich Text Editor Based on TipTap*

- **Rich Text Editing**: Professional editor based on TipTap, supporting formatted text, headings, paragraphs, etc.
- **Personalized Settings**: Support for font, font size, line height settings, bold, italic formatting, and auto-save configuration
- **Real-time Statistics**: Real-time display of chapter word count, total book word count, and writing speed (words per minute/hour)
- **Smart Features**: Auto-save, full-text search, one-click export of all chapters
- **Keyboard Shortcuts**: Ctrl/Cmd + S for quick save, Ctrl/Cmd + F for search
- **Multiple Themes**: Light, dark, eye-protection yellow, and other theme modes
- **Character Highlighting**: Support for highlighting character names in the editor, making it easy to track character appearances
- **Forbidden Word Detection**: Intelligent detection and marking of forbidden words, supports custom forbidden word lists with real-time underline prompts
- **Paragraph Dragging**: Support for dragging to adjust paragraph order, flexibly organizing content structure
- **Text Highlighting**: Support for text highlighting to mark important content

### 🗺️ Map Design Tool

![Map Design](https://raw.githubusercontent.com/xiaoshengxianjun/51mazi/main/static/maps.png)

*Powerful Map Design Tool - Professional Canvas Drawing and Resource Management*

The map design tool is a major highlight of this software, providing professional-level map drawing capabilities:

#### Core Drawing Tools
- **Brush Tool (P)**: Freehand drawing with customizable size and opacity, smooth drawing experience
- **Eraser Tool (E)**: Precise erasing with adjustable erasing range
- **Shape Tool (G)**: Supports lines, rectangles, circles, rounded rectangles, five-pointed stars, arrows, and other shapes
- **Paint Bucket Tool**: Quick area filling with custom colors and intelligent boundary detection
- **Text Tool (T)**: Add text annotations with customizable font, size, and color
- **Resource Tool**: Built-in rich resource icon library, supports drag-and-drop to add buildings, landmarks, and other map elements
- **Background Tool**: Set canvas background color to create personalized map styles

#### Advanced Features
- **Selection Tool (V)**: Select, move, resize, and rotate drawn elements
- **Move Tool (H)**: Pan canvas view, supports spacebar for quick switching
- **Zoom Control**: Supports canvas zoom (Ctrl/Cmd + scroll wheel), pan, and reset view
- **Undo/Redo**: Complete history management with multi-step undo and redo
- **Real-time Preview**: Real-time preview during drawing
- **Parameter Adjustment**: Size and opacity sliders for precise control of drawing effects
- **Color Selection**: Rich color presets with support for custom colors
- **Save & Export**: Automatically generates map preview images, supports saving as PNG format

### 👥 Relationship Graph Management

![Relationship Graph](https://raw.githubusercontent.com/xiaoshengxianjun/51mazi/main/static/relation.png)

*Visual Relationship Graph - Clearly Displaying Character Relationship Networks*

The relationship graph feature helps authors better manage complex character relationships:
- **Visual Component**: Visualization based on relation-graph-vue3
- **Node Management**: Add, delete, modify, and query character nodes with support for custom node styles
- **Avatar Support**: Support for setting avatars for character nodes (local images or network images)
- **Dynamic Fonts**: Automatically adjusts font size based on node hierarchy
- **Connection Editing**: Edit relationship connection types and descriptions
- **Thumbnail Generation**: Automatically generates relationship graph previews
- **Data Persistence**: Local file storage ensures data security

### 📖 Dictionary Management

The dictionary feature provides powerful vocabulary management capabilities for novel creation:
- **Tree Structure**: Supports multi-level dictionary classification, clearly organizing vocabulary systems
- **Entry Management**: Supports creating, editing, and deleting entries with information such as names and descriptions
- **Drag-and-Drop Sorting**: Supports dragging to adjust entry order and hierarchy
- **Quick Search**: Supports keyword search to quickly locate target entries
- **Data Persistence**: Local file storage ensures data security
- **Character Profile Integration**: Entries can serve as character tags, achieving vocabulary and character association

### 🎲 Random Name Generator

![Random Names](https://raw.githubusercontent.com/xiaoshengxianjun/51mazi/main/static/random-name.png)

*Intelligent Random Name Generator - Providing Inspiration for Character Naming*

The random name generator provides powerful naming assistance for novel creation:

#### Core Features
- **Multiple Type Support**: Supports Chinese names, Japanese names, Western names, faction names, place names, secret technique names, magical artifact names, elixir names, and other types
- **Parameter Customization**: Supports setting surname, gender, name length, middle characters, and other parameters for precise control of generation results
- **Batch Generation**: Can generate 24 names at once, providing rich choices
- **AI Intelligent Naming**: Integrated DeepSeek AI to intelligently generate names that match cultural background and character settings
  - **Intelligent Understanding**: AI generates names that meet requirements based on type, gender, surname, and other parameters
  - **Cultural Adaptation**: Japanese and Western names are automatically converted to Chinese transliteration, ensuring all names are pure Chinese
  - **Creativity and Reasonableness**: Generated names are both creative and conform to cultural background and naming conventions
  - **Intelligent Fallback**: Automatically falls back to local generation when AI fails, ensuring functionality availability
- **Local Generation**: Retains traditional local word bank generation method, usable without network
- **Seamless Switching**: Free switching between AI generation and local generation
- **Rate Limiting**: Intelligently controls API call frequency to avoid excessive use

### 👤 Character Profile Management

![Character Profile](https://raw.githubusercontent.com/xiaoshengxianjun/51mazi/main/static/character-profile.png)

*Detailed Character Profile Management - Recording Character Information and Background*

Character profiles (character roster) help authors manage role information in a structured way, with multiple view and edit options:

- **Dual View Modes**: Switch between **Card** and **Table** views; the app remembers the last choice per book
- **Drawer Editing**: Create/edit characters in a right-side drawer so the form and list stay visible
- **Basic Info**: Name, gender, age, height, appearance notes, biography, tags, marker color
- **Avatar**: Image URL or local file for list and card thumbnails
- **Character Image List**: Support for multiple vertical full-body character images (different styles or poses)
  - Table view has a character image column (multiple thumbnails); card view shows the image list below the card
  - When editing, add images via **Choose Local Image** or **AI Generate Character Image**; each image can be removed
  - Images are stored under the book folder in `character_images`
- **AI Generate Character Image**: Integrated with Tongyi Wanxiang; one-click generation of vertical full-body images (720×1280)
  - **Style options**: Anime, Ghibli-style, retro anime, photorealistic, 3D render, Western cartoon, Chinese-style illustration, watercolor, ink wash, thick paint, cyberpunk, pixel art, etc.
  - **Composition & pose**: Full-body standing, half-body, dynamic pose, etc.
  - Appearance description can be prefilled from the character’s “Appearance” field; generate multiple images, then pick one to confirm and add to the list
- **Drag to Sort**: In table mode, drag rows to reorder characters; order is saved automatically
- **Data Persistence**: Character data and image paths stored locally and linked with dictionary tags

### 📅 Timeline Management

![Timeline](https://raw.githubusercontent.com/xiaoshengxianjun/51mazi/main/static/timeline.png)

*Timeline Management Tool - Organizing Story Development Threads*

### 📊 Event Sequence Diagram Management

![Event Sequence](https://raw.githubusercontent.com/xiaoshengxianjun/51mazi/main/static/events-sequence.png)

*Visual Event Sequence Diagram Management - Intuitively Displaying Event Timeline and Progress*

The event sequence diagram feature provides powerful timeline management capabilities for novel creation:
- **Timeline Visualization**: Visual event display based on time cells
- **Event Management**: Supports creating, editing, and deleting events with information such as introduction, details, and progress
- **Drag-and-Drop Adjustment**: Intuitive drag-and-drop operations to adjust event time positions, intelligently distinguishing between click and drag operations
- **Progress Tracking**: Event progress bar display, supports 0-100% progress management with visual progress bar effects
- **Multiple Sequence Diagrams**: Supports creating multiple independent sequence diagrams to meet different chapter or storyline needs
- **Panel Control**: Supports collapsing/expanding the left panel to optimize interface layout
- **Color Management**: Rich color selection with support for custom event colors
- **Hover Tooltips**: Mouse hover displays complete event details
- **Data Persistence**: Local file storage ensures data security

### 🏢 Organization Structure Management

![Organization Structure](https://raw.githubusercontent.com/xiaoshengxianjun/51mazi/main/static/organization.png)

*Visual Organization Structure Management - Clearly Displaying Organizational Structure and Hierarchy*

The organization structure feature provides powerful organizational management capabilities for novel creation:
- **Hierarchical Structure**: Supports multi-level organizational structures, clearly displaying superior-subordinate relationships
- **Node Management**: Supports creating, editing, and deleting organizational nodes with information such as names and descriptions
- **Visual Display**: Visualization component based on relationship graphs, intuitively displaying organizational structure
- **Color Differentiation**: Different levels use different colors for easy distinction and understanding
- **Drag-and-Drop Adjustment**: Supports drag-and-drop operations to adjust organizational structure layout
- **Multiple Organization Management**: Supports creating multiple independent organizational structures to meet different story needs
- **Data Persistence**: Local file storage ensures data security

### 📘 User Guide

Built-in complete user guide functionality to help users get started quickly:
- **Feature Descriptions**: Detailed feature introductions and usage instructions
- **Operation Guides**: Clear operation steps and tips
- **FAQ**: Answers to common user questions
- **Quick Start**: Beginner-friendly tutorial

## 🛠️ Technical Architecture Highlights

### Modern Technology Stack

- **Electron 39.2.7**: Cross-platform desktop application framework
- **Vue 3.5.22**: Progressive JavaScript framework
- **Vite 6.4.0**: Modern build tool
- **Element Plus 2.11.4**: Enterprise-level UI component library

### Core Function Libraries

- **TipTap 3.7.0**: Rich text editor based on ProseMirror
- **ECharts 6.0.0**: Data visualization chart library
- **relation-graph-vue3 2.2.11**: Relationship graph visualization component
- **Pinia 3.0.3**: Official state management library recommended for Vue 3

## 🚀 Software Advantages

### 1. Complete Local Storage
All data is stored locally, protecting user privacy without worrying about data leaks.

### 2. Cross-Platform Support
Based on the Electron framework, supports Windows, macOS, Linux, and other platforms.

### 3. Professional Writing Experience
- Professional rich text editor based on TipTap
- Real-time word count statistics and writing speed calculation
- Intelligent auto-save mechanism
- Multiple theme modes to meet different needs

### 4. Creative Assistance Tools
- **Professional Map Design Tool**: Canvas drawing engine with support for brush, shapes, text, paint bucket, resource tools, and more. Built-in resource icon library, drag-and-drop to add buildings and landmarks, complete history and undo/redo functionality
- **Intelligent Editor Features**: Character highlighting, forbidden word detection, paragraph dragging, text highlighting, and other practical features
- **AI-Assisted Creation**: Integrated DeepSeek + Tongyi Wanxiang
  - **AI Random Naming (DeepSeek)**: Multiple name types and parameters, with automatic fallback to local generation when AI fails
  - **AI Novel Cover (Tongyi Wanxiang)**: Generate multiple covers by title/pen name/size/prompt and set one as the book cover
  - **AI Character Image (Tongyi Wanxiang)**: In Character Profile, generate vertical full-body character images by style and appearance description; support multiple images per character for different styles/poses
- Relationship graph management for complex character relationships with avatar and dynamic font support
- Event sequence diagram management for event timelines and progress with visual progress tracking
- Organization structure management to display organizational structure and hierarchy
- Dictionary management for vocabulary systems with tree structure and drag-and-drop sorting support
- Random name generator providing creative inspiration (supports both AI and local modes)
- Character profile (character roster) for recording character info, with character image list and Tongyi Wanxiang AI character image generation
- Intelligent book management with bookshelf password protection and book password protection

### 5. User-Friendly Interface
- Clean and beautiful interface design
- Responsive layout adapting to different screens
- Intuitive operation flow
- Complete error handling mechanism
- **Writing Encouragement Toasts**: Start after 2 days, then show randomly (once per day, auto-close in 5s or manual close)
- **Version Display**: Shows current app version at the bottom of the left sidebar for easier issue reporting

## 📊 Feature Comparison

| Feature | 51mazi | Other Writing Software |
|---------|--------|----------------------|
| Local Storage | ✅ Completely Localized | ❌ Partially Cloud Storage |
| Password Protection | ✅ Bookshelf Password + Book Password Dual Protection | ❌ Lack of Security Protection |
| Map Design | ✅ Professional Canvas Drawing, Resource Management, Multiple Tools | ❌ Requires External Tools |
| Editor Features | ✅ Character Highlighting, Forbidden Word Detection, Paragraph Dragging | ❌ Basic Editing Features |
| Relationship Graph | ✅ Visual Management with Avatar Support | ❌ Manual Recording |
| Event Sequence Management | ✅ Timeline Visualization, Progress Tracking | ❌ Lack of Time Management |
| Organization Structure | ✅ Visual Organization Management | ❌ Lack of Organization Management |
| Dictionary | ✅ Tree Structure, Drag-and-Drop Sorting | ❌ Lack of Vocabulary Management |
| AI Assistance | ✅ DeepSeek Naming + Tongyi Wanxiang Cover/Character Image | ❌ Lack of AI Features |
| Character Image Management | ✅ Multiple character images, AI full-body generation | ❌ Single avatar or external links only |
| Smart Operations | ✅ Intelligent Drag-and-Drop, Keyboard Shortcut Support | ❌ Cumbersome Operations |
| Multiple Themes | ✅ Multiple Themes | ❌ Single Theme |
| User Guide | ✅ Built-in Complete Guide | ❌ Requires External Documentation |
| Cross-Platform | ✅ Full Platform Support | ❌ Platform Limitations |
| Free to Use | ✅ Completely Free | ❌ Paid Subscription |

## 🎯 Target Audience

- **Web Novel Authors**: Need to manage complex plots and character relationships
- **Traditional Literary Creators**: Need a professional writing environment
- **Script Writers**: Need timeline and character management
- **Game Story Planners**: Need map design and world-building

## 💡 Usage Recommendations

### Getting Started
1. First, set the book main directory
2. (Optional) Set bookshelf password to protect all book data
3. Create your first book (supports password protection)
4. Familiarize yourself with basic editor functions (shortcut Ctrl/Cmd + S to save)
5. Try advanced editor features
   - Enable character highlighting to track character appearances
   - Set forbidden word list to avoid sensitive vocabulary
   - Use paragraph dragging to flexibly organize content
6. (Optional) Open **AI Settings** from the left menu, configure DeepSeek / Tongyi Wanxiang API keys, and click “Validate”
7. (Optional) Use **AI Cover Generation** in the book create/edit drawer: fill in title & type, generate covers and confirm one
8. (Optional) In Character Profile, add **character images** for a role: choose a local image or click **AI Generate Character Image**, select style and fill appearance description to generate vertical full-body images; you can save multiple images per character
9. Try the map design tool
   - Use brush tool to draw terrain outlines
   - Use paint bucket to fill area colors
   - Drag resource icons to add buildings and landmarks
10. Build character relationship graph (can set avatars)
11. Create dictionary to manage proper nouns in the story
12. Experience AI random naming feature
   - Configure DeepSeek API Key in settings (optional)
   - Use AI intelligent naming to generate character names
   - Try different parameter settings to experience AI's intelligent understanding capabilities
13. In Character Profile, complete characters: fill in appearance and biography, and add multiple character images (different styles or poses) for the same character

### Advanced Usage
1. Use timeline to manage story development
2. Use event sequence diagram to plan event timeline and progress (supports drag-and-drop adjustment)
3. Use organization structure management to display organizational structure and hierarchy
4. Use character profiles to record detailed information, associating tags from the dictionary; add multiple character images (local or AI-generated) per character, using style and composition options for different full-body portraits
5. Combine map design to build worldviews
   - Use shape tool to draw precise terrain boundaries
   - Use text tool to add place name annotations
   - Utilize resource icons to quickly build map elements
   - Use selection tool to adjust element positions and sizes
   - Utilize undo/redo functionality to optimize map details
6. Use random name generator to enrich characters
   - Configure DeepSeek API Key to enable AI intelligent naming
   - Use AI to generate names that match cultural backgrounds
   - Try generating different types and styles of names (ancient style, Japanese style, Western style, etc.)
   - Utilize batch generation feature to quickly screen suitable names
7. Set bookshelf password protection to ensure all data security
8. Use relationship graph avatar feature to enhance visual effects
9. Build a complete dictionary system, categorizing and managing proper nouns, place names, organizations, etc. in the story
10. Enable forbidden word detection in the editor to detect and mark sensitive vocabulary in real-time
11. Use character highlighting feature to quickly locate character appearances in text
12. View built-in user guide to learn more advanced features and tips

## 🔮 Future Outlook

As an open-source novel writing software, 51mazi has great development potential:

- **AI Feature Expansion**: Expand more AI-assisted features on top of existing AI naming, cover, and character image
  - ✅ **AI Random Naming**: Implemented, supports multiple types and parameter settings
  - ✅ **AI Novel Cover**: Implemented; Tongyi Wanxiang generates covers from title/pen name/style
  - ✅ **AI Character Image**: Implemented; Tongyi Wanxiang generates vertical full-body character images with multiple styles and poses, supports saving multiple images per character
  - 🔮 **AI Continuation**: Intelligently continue writing based on existing content
  - 🔮 **AI Polishing**: Optimize text expression, improve writing quality
  - 🔮 **AI Summarization**: Automatically generate chapter summaries
  - 🔮 **AI Dialogue Generation**: Generate character dialogues
  - 🔮 **AI Plot Suggestions**: Provide plot suggestions based on existing content
  - 🔮 **AI Scene Description**: Generate scene descriptions
  - 🔮 **AI Outline Generation**: Generate novel outlines based on themes
- **Plugin System**: Support for third-party plugin extensions
- **Cloud Sync**: Optional cloud data synchronization
- **Collaboration Features**: Multi-user collaborative creation
- **Community Features**: Author communication platform

## 🚀 Development Environment Setup

### Install Dependencies
```bash
npm install
```

### Development Mode
```bash
npm run dev
```

### Build Package
```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## 📝 Summary

51mazi is a comprehensive and beautifully designed novel writing software that not only provides a professional writing environment but also integrates various creative assistance tools. Whether you're a novice author or an experienced creator, you can find a writing style that suits you in this software.

**Main Advantages**:
- ✅ Completely localized storage, protecting privacy
- ✅ Bookshelf password + book password dual protection, ensuring creative security
- ✅ Cross-platform support, convenient to use
- ✅ Comprehensive features, meeting various creative needs
- ✅ **AI-Assisted Creation**: DeepSeek intelligent naming + Tongyi Wanxiang cover/character image, improving creative efficiency
- ✅ Intelligent editor features (character highlighting, forbidden word detection, paragraph dragging)
- ✅ Professional map design tool with built-in resource library
- ✅ Dictionary management with flexible tree structure organization
- ✅ Smart operation experience, improving creative efficiency
- ✅ Beautiful interface with excellent user experience
- ✅ Built-in user guide for quick start
- ✅ Open source and free, continuously updated

If you're looking for a professional novel writing software, 51mazi is definitely worth trying. It can not only improve your creative efficiency but also make your creative process more interesting and organized.

---

### 📚 Related Links
- **Project Repository**: [GitHub - 51mazi](https://github.com/xiaoshengxianjun/51mazi)
- **Technology Stack**: Electron + Vue 3 + TipTap + Element Plus + Pinia + DeepSeek + Tongyi Wanxiang
- **Keywords**: Desktop Application, Rich Text Editing, Canvas Drawing, Relationship Graph, Novel Writing, Dictionary, Forbidden Word Detection, Character Highlighting, AI Assistance, AI Cover, AI Character Image, AI Writing, Intelligent Naming, Character Roster

## 📞 Contact & Support

### Help Center / Business Cooperation

![QQ Group QR Code](static/QQQRCode.png)

- QQ Group: 777690109
- Issue Feedback / Business Cooperation Email: <fomazi@163.com>

### Sponsor the Author

Thank you to everyone who supports this project! You can support via:

| WeChat Pay | Alipay |
|------------|--------|
| ![WeChat Pay QR Code](static/WeChatPayQRCode.png) | ![Alipay QR Code](static/AliPayQRCode.png) |

## 🏷️ Tags
`#Electron` `#Vue3` `#DesktopApplication` `#RichTextEditing` `#CanvasDrawing` `#RelationshipGraph` `#NovelWriting` `#CharacterRoster` `#FrontendDevelopment` `#Dictionary` `#ForbiddenWordDetection` `#CharacterHighlighting` `#AIAssistance` `#AICovers` `#AICharacterImage` `#AIWriting` `#TongyiWanxiang` `#DeepSeek` `#IntelligentNaming`

---

*The 51mazi software introduced in this article is currently an open-source project. Developers interested in contributing are welcome. For more technical details and development information, please refer to the project's GitHub repository.*

> 💡 **If this article helps you, please give it a ⭐️!**
