import { Router } from 'express';
import path from 'path';
import fs from 'fs';
const router = Router();
// Serve the OpenAPI JSON
router.get('/openapi.json', (req, res) => {
    const p = path.join(process.cwd(), 'src', 'docs', 'openapi.json');
    console.log('Serving OpenAPI JSON from', p);
    if (!fs.existsSync(p))
        return res.status(404).send('Not found');
    res.sendFile(p);
});
// Serve a simple Swagger UI HTML shell that loads the OpenAPI JSON from /api/openapi.json
router.get('/docs', (_req, res) => {
    const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>API Docs</title>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@4/swagger-ui.css" />
    </head>
    <body>
      <div id="swagger"></div>
      <script src="https://unpkg.com/swagger-ui-dist@4/swagger-ui-bundle.js"></script>
      <script>
        window.onload = function() {
          const ui = SwaggerUIBundle({
            url: '/api/openapi.json',
            dom_id: '#swagger',
            presets: [SwaggerUIBundle.presets.apis],
            layout: 'BaseLayout'
          })
        }
      </script>
    </body>
  </html>`;
    res.type('html').send(html);
});
export default router;
//# sourceMappingURL=router.js.map