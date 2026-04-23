import { Router } from 'express';
import { openApiSpec } from '../openapi.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(openApiSpec);
});

// Swagger-UI hosted from a CDN — zero backend deps.
router.get('/ui', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html>
  <head>
    <title>PIM API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({ url: '/api/v1/docs', dom_id: '#swagger-ui' });
      };
    </script>
  </body>
</html>`);
});

export default router;
