const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'api', 'routes', 'index.ts');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Add the import
if (!content.includes("import enhancedMessagingRoutes from './enhanced-messaging.routes';")) {
  content = content.replace(
    "import moderationRoutes from './moderation.routes';",
    "import moderationRoutes from './moderation.routes';\nimport enhancedMessagingRoutes from './enhanced-messaging.routes';"
  );
}

// Add the route
if (!content.includes("router.use('/', enhancedMessagingRoutes);")) {
  content = content.replace(
    "// Mount moderation routes (safety features)\nrouter.use('/moderation', moderationRoutes);",
    "// Mount moderation routes (safety features)\nrouter.use('/moderation', moderationRoutes);\n\n// Mount enhanced messaging routes (reactions, pinning, search, GIFs, icebreakers)\nrouter.use('/', enhancedMessagingRoutes);"
  );
}

// Write the file
fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Fixed routes/index.ts - added enhanced-messaging routes');
