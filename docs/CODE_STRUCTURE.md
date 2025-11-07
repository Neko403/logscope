# LogScope - Project Structure

## 📂 Directory Structure

```
logscope/
├── node_modules/           # Dependencies
├── public/                 # Static assets
│   └── css/
│       └── style.css      # Main stylesheet
├── routes/                # Express routes
│   ├── index.js          # Page routes
│   └── api.js            # API endpoints
├── sample_logs/           # Sample log files
│   └── mikrotik_sample.log
├── uploads/               # Uploaded log files
├── utils/                 # Utility modules
│   ├── logParser.js      # Log parsing logic
│   └── logAnalyzer.js    # Log analysis logic
├── views/                 # EJS templates
│   ├── layout.ejs        # Main layout template
│   ├── index.ejs         # Dashboard page
│   ├── upload.ejs        # Upload page
│   ├── analysis.ejs      # Analysis page
│   ├── 404.ejs           # 404 error page
│   └── error.ejs         # Error page
├── .gitignore
├── package.json
├── server.js             # Main server file
├── README.md             # Main documentation
├── QUICK_START.md        # Quick start guide
└── jsconfig.json         # JavaScript config
```

## 🔧 Tech Stack

### Backend
- **Express.js** - Web framework
- **EJS** - Template engine
- **body-parser** - Request parsing
- **express-fileupload** - File upload handling
- **moment** - Date/time manipulation

### Frontend
- **Element UI** - Vue.js-based UI components
- **Alpine.js** - Lightweight JavaScript framework
- **Chart.js** - Data visualization
- **Axios** - HTTP client
- **Font Awesome** - Icons

## 🎯 Key Features

### 1. Log Parsing (`utils/logParser.js`)
- Parses Mikrotik log format
- Supports multiple timestamp formats
- Extracts: timestamp, category, level, message
- Handles malformed log entries gracefully

### 2. Log Analysis (`utils/logAnalyzer.js`)
- Statistical analysis (count by level, category)
- Timeline generation for charts
- Search and filter capabilities
- Time range filtering

### 3. REST API (`routes/api.js`)
- `POST /api/upload` - Upload and parse log files
- `GET /api/logs?level=&category=&search=` - Get filtered logs
- `GET /api/stats` - Get statistics summary
- `GET /api/timeline` - Get timeline data
- `DELETE /api/logs` - Clear all logs

### 4. Web Interface

#### Dashboard (`views/index.ejs`)
- Statistics cards (Info, Warning, Error, Total)
- Line chart for timeline
- Doughnut chart for top categories
- Recent errors table
- Auto-refresh capability

#### Upload Page (`views/upload.ejs`)
- Drag & drop file upload
- File validation (type, size)
- Upload progress feedback
- Format documentation
- Quick actions

#### Analysis Page (`views/analysis.ejs`)
- Advanced filtering (level, category, search)
- Sortable, paginated table
- Export to CSV
- Detailed log view dialog
- Real-time filter results

## 🎨 Styling

Custom CSS with:
- CSS variables for theming
- Responsive grid layouts
- Card-based design
- Gradient backgrounds
- Smooth animations
- Mobile-friendly

## 🔐 Security Considerations

Current implementation:
- File size limit (10MB)
- File type validation
- Error handling

Recommended additions for production:
- Authentication/authorization
- Rate limiting
- Input sanitization
- HTTPS
- Database storage instead of in-memory

## 📊 Data Flow

1. **Upload**: Client → `/api/upload` → logParser → Store
2. **Display**: Client → `/api/logs` → Filter → Response
3. **Stats**: Client → `/api/stats` → logAnalyzer → Response
4. **Timeline**: Client → `/api/timeline` → logAnalyzer → Response

## 🚀 Performance

- In-memory log storage (fast but not persistent)
- Client-side pagination
- Lazy chart rendering
- Efficient filtering algorithms

## 🔄 Future Enhancements

1. **Database Integration**
   - PostgreSQL/MongoDB for persistent storage
   - Better query performance

2. **Real-time Monitoring**
   - WebSocket for live log streaming
   - Auto-refresh dashboard

3. **Advanced Analytics**
   - Machine learning for anomaly detection
   - Predictive analysis
   - Custom alerts

4. **Export Options**
   - PDF reports
   - JSON export
   - Email notifications

5. **Multi-user Support**
   - User authentication
   - Role-based access
   - Personal dashboards

6. **Enhanced Visualization**
   - Heat maps
   - Network topology
   - Custom dashboards

## 📝 Code Quality

- Modular architecture
- Separation of concerns
- Error handling throughout
- Comments in complex logic
- Consistent naming conventions

## 🧪 Testing

To add tests, consider:
- Unit tests for parser and analyzer
- Integration tests for API endpoints
- E2E tests for user flows

Recommended tools:
- Jest for unit tests
- Supertest for API tests
- Cypress for E2E tests

## 📚 Documentation

- README.md - Main documentation
- QUICK_START.md - Getting started guide
- CODE_STRUCTURE.md - This file
- Inline comments in code

## 🛠️ Development Workflow

1. **Local Development**
   ```bash
   npm run dev  # Auto-reload with nodemon
   ```

2. **Production**
   ```bash
   npm start    # Standard node server
   ```

3. **Code Organization**
   - Routes define endpoints
   - Utils handle business logic
   - Views handle presentation
   - Public serves static assets

## 🌐 Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- IE11 not supported (due to Alpine.js)

## 📦 Dependencies Management

Keep dependencies updated:
```bash
npm outdated
npm update
```

Security audit:
```bash
npm audit
npm audit fix
```

---

**Built with ❤️ for Mikrotik network administrators**
