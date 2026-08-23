import type { HomeContent } from './types'

export const esHome = {
  languageName: 'Español',
  nav: {
    product: 'Producto', howItWorks: 'Cómo funciona', infrastructure: 'Infraestructura',
    security: 'Seguridad', signIn: 'Ingresar', sandbox: 'Crear cuenta sandbox',
    menuOpen: 'Abrir menú', menuClose: 'Cerrar menú',
  },
  hero: {
    label: 'Sandbox B2B - Polygon Amoy',
    title: 'Pix en Brasil. Liquidación en tu billetera.',
    description: 'Valida, en un entorno de pruebas, el flujo entre un cobro Pix simulado y el envío de MockUSDT a tu billetera en Polygon Amoy.',
    primaryCta: 'Crear cuenta sandbox', secondaryCta: 'Entender el flujo',
  },
  eventPanel: { operation: 'OPERACIÓN #PGS-2048', environment: 'TESTNET', simulated: 'simulado' },
  transparency: [
    { title: 'Entorno sandbox', body: 'Sin movimiento de fondos reales.' },
    { title: 'MockUSDT', body: 'Token de prueba sin valor financiero.' },
    { title: 'Billetera propia', body: 'Peragus no mantiene el saldo del cliente.' },
    { title: 'Polygon Amoy', body: 'Transacciones verificables en una red de pruebas.' },
  ],
  howItWorks: {
    eyebrow: 'Flujo operativo', title: 'Tres estados. Un registro verificable.',
    description: 'Sigue el recorrido del pago de prueba hasta la transacción en la red.',
    steps: [
      { title: 'Crea un cobro', body: 'Inicia un pago de prueba en BRL y recibe instrucciones Pix simuladas.' },
      { title: 'Confirma el evento', body: 'Simula la confirmación y sigue el cambio de estado de la operación.' },
      { title: 'Verifica la liquidación', body: 'Comprueba el envío de MockUSDT a la billetera indicada en Polygon Amoy.' },
    ],
  },
  operations: {
    eyebrow: 'Para finanzas y operaciones', title: 'Menos abstracción. Más visibilidad en cada etapa.',
    description: 'Capacidades demostrables en el sandbox, sin promesas de producción.',
    items: [
      { title: 'Estados claros', body: 'Sigue la creación, confirmación y liquidación.' },
      { title: 'Referencia entre sistemas', body: 'Relaciona el pago de prueba con la transacción on-chain.' },
      { title: 'Billetera bajo tu control', body: 'Define la dirección de recepción en el entorno de pruebas.' },
      { title: 'Flujo preparado para integración', body: 'Valida el modelo antes de elegir un gateway o BaaS.' },
    ],
  },
  useCases: {
    eyebrow: 'Quién puede probarlo', title: 'Infraestructura para quienes venden a Brasil.',
    merchant: { title: 'Comercios internacionales', body: 'Prueba una experiencia Pix para compradores brasileños y la recepción del activo de prueba en una billetera propia.' },
    acquirer: { title: 'Adquirentes y plataformas', body: 'Valida cómo el flujo puede incorporarse a una operación de pagos existente.' },
  },
  infrastructure: {
    eyebrow: 'Tecnología demostrable', title: 'Del evento de pago a la transacción en la red.',
    description: 'Una secuencia explícita conecta cada estado del pago con la liquidación de prueba.',
    nodes: ['Cliente B2B', 'Pix simulado', 'Orquestación Peragus', 'MockUSDT en Amoy'],
  },
  disclosure: {
    eyebrow: 'Límites del entorno', title: 'Un sandbox para validación técnica.',
    body: 'MockUSDT no es USDT, no tiene valor financiero y funciona solamente en Polygon Amoy. Pix permanece simulado hasta una futura integración con un gateway o BaaS.',
  },
  finalCta: {
    eyebrow: 'Primera prueba', title: 'Ejecuta tu primera liquidación de prueba.',
    body: 'Crea tu cuenta, genera una API key y sigue el flujo hasta la transacción en Polygon Amoy.',
    primary: 'Crear cuenta sandbox', secondary: 'Explorar documentación',
  },
  footer: {
    description: 'Sandbox B2B para validar flujos Pix y liquidación on-chain.', product: 'Producto',
    resources: 'Recursos', legal: 'Legal', documentation: 'Documentación', terms: 'Términos',
    privacy: 'Privacidad', compliance: 'Cumplimiento',
  },
  seo: {
    title: 'Peragus | Sandbox B2B para Pix y liquidación on-chain',
    description: 'Valida un flujo de pago Pix simulado y liquidación en MockUSDT en Polygon Amoy.',
  },
} satisfies HomeContent
