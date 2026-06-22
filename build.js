// Compila los componentes JSX en bundles pre-transpilados con esbuild.
// Reemplaza a Babel Standalone: todo el JSX se transpila aquí (build) y el
// navegador solo descarga JS plano. Produce los bundles de la tienda, el
// checkout, la página de pago y el panel de admin de forma independiente.
const esbuild = require('esbuild');
const fs = require('fs');

if (!fs.existsSync('dist')) fs.mkdirSync('dist');

const build = (files, outFile) => {
  const combined = files
    .map((f) => `\n/* === ${f} === */\n` + fs.readFileSync(f, 'utf8'))
    .join('\n');

  return esbuild
    .transform(combined, {
      loader: 'jsx',
      jsx: 'transform',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      minify: true,
      legalComments: 'none',
    })
    .then((result) => {
      fs.writeFileSync(outFile, result.code);
      console.log(`✓ ${outFile}  (${(result.code.length / 1024).toFixed(1)} KB)`);
    });
};

Promise.all([
  // Admin — totalmente pre-compilado con esbuild, sin Babel Standalone en runtime.
  // Las vistas van primero para que sus globals window.* existan cuando AdminPanel
  // renderice. (Mismo orden que tenían los <script type="text/babel"> del HTML.)
  build([
    'admin/views/InventoryView.js',
    'admin/views/OrdersView.js',
    'admin/views/DesignView.js',
    'admin/views/DiscountsView.js',
    'admin/views/BannersView.js',
    'admin/views/AnalyticsView.js',
    'admin/views/SuperAdminView.js',
  ], 'dist/admin-views.js'),

  build(['admin/admin-panel.js'], 'dist/admin-panel.js'),

  // firebase-init.js va PRIMERO para definir db / IMGBB_API_KEY antes de utils.js.
  build([
    'js/firebase-init.js',
    'js/utils.js',
    'js/components/PopupBanner.js',
    'js/components/Home.js',
    'js/components/Cart.js',
    'js/App.js',
  ], 'dist/app.js'),

  build([
    'js/firebase-init.js',
    'js/utils.js',
    'js/components/ProductDetail.js',
    'js/components/Cart.js',
    'js/product-entry.js',
  ], 'dist/product.js'),

  build([
    'js/firebase-init.js',
    'js/utils.js',
    'js/checkout-entry.js',
  ], 'dist/checkout.js'),

  // La página de pago NO usa Firestore directamente (todo pasa por /api/payment),
  // por lo que no necesita firebase-init.js. Solo utils + la entry de pago.
  build([
    'js/utils.js',
    'js/pago-entry.js',
  ], 'dist/pago.js'),
]).catch((err) => {
  console.error(err);
  process.exit(1);
});
