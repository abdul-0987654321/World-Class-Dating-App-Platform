const fs = require('fs');
const path = require('path');

// File replacements mapping
const replacements = [
  {
    file: 'src/index.ts',
    from: "import { createLogger } from '@flamoral/shared';",
    to: "import { createLogger } from './utils/logger';"
  },
  {
    file: 'src/infrastructure/database/connection.ts',
    from: "import { createLogger } from '@flamoral/shared';",
    to: "import { createLogger } from '../../utils/logger';"
  },
  {
    file: 'src/infrastructure/clients/notification-service.client.ts',
    from: "import { createLogger, ServiceClient } from '@flamoral/shared';",
    to: "import { createLogger } from '../../utils/logger';\nimport { ServiceClient } from '../../utils/service-client';"
  },
  {
    file: 'src/services/aws-rekognition.service.ts',
    from: "import { createLogger } from '@flamoral/shared';",
    to: "import { createLogger } from '../utils/logger';"
  },
  {
    file: 'src/services/text-moderation.service.ts',
    from: "import { createLogger } from '@flamoral/shared';",
    to: "import { createLogger } from '../utils/logger';"
  },
  {
    file: 'src/services/moderation.service.ts',
    from: "import { createLogger } from '@flamoral/shared';",
    to: "import { createLogger } from '../utils/logger';"
  },
  {
    file: 'src/routes/moderation.routes.ts',
    from: "import { createLogger } from '@flamoral/shared';",
    to: "import { createLogger } from '../utils/logger';"
  },
  {
    file: 'src/routes/csam.routes.ts',
    from: "import { createLogger } from '@flamoral/shared';",
    to: "import { createLogger } from '../utils/logger';"
  },
  {
    file: 'src/services/csam-detection.service.ts',
    from: "import { createLogger } from '@flamoral/shared';",
    to: "import { createLogger } from '../utils/logger';"
  },
  {
    file: 'src/services/csam-audit.service.ts',
    from: "import { createLogger } from '@flamoral/shared';",
    to: "import { createLogger } from '../utils/logger';"
  },
  {
    file: 'src/services/csam-quarantine.service.ts',
    from: "import { createLogger } from '@flamoral/shared';",
    to: "import { createLogger } from '../utils/logger';"
  },
  {
    file: 'src/services/ncmec-reporting.service.ts',
    from: "import { createLogger } from '@flamoral/shared';",
    to: "import { createLogger } from '../utils/logger';"
  },
  {
    file: 'src/services/perceptual-hash.service.ts',
    from: "import { createLogger } from '@flamoral/shared';",
    to: "import { createLogger } from '../utils/logger';"
  },
  {
    file: 'src/services/staff-notification.service.ts',
    from: "import { createLogger } from '@flamoral/shared';",
    to: "import { createLogger } from '../utils/logger';"
  }
];

replacements.forEach(({ file, from, to }) => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(from)) {
      content = content.replace(from, to);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Fixed: ${file}`);
    } else {
      console.log(`- Skipped (already fixed or not found): ${file}`);
    }
  } else {
    console.log(`✗ File not found: ${file}`);
  }
});

console.log('\nImport replacement complete!');
