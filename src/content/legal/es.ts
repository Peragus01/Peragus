import { toSections, type LegalContent, type LegalRow } from './types'

const esMeta = {
  version: 'Borrador editorial 0.1',
  effectiveDate: '23 de agosto de 2026',
  reviewNotice: 'Contenido editorial sujeto a revisión jurídica cualificada antes de su publicación.',
}

const esHeaders = {
  terms: { title: 'Términos del sandbox', description: 'Condiciones editoriales para la evaluación técnica del entorno de pruebas.' },
  privacy: { title: 'Privacidad', description: 'Información factual sobre datos en el sitio institucional y en el futuro sandbox.' },
  compliance: { title: 'Cumplimiento', description: 'Límites actuales y criterios para futuras integraciones operativas.' },
  security: { title: 'Seguridad', description: 'Orientaciones sobre dominio, billetera y credenciales en el entorno de pruebas.' },
}

const esSections = {
  terms: [
    ['scope', 'Alcance del sandbox', 'El sandbox de Peragus demuestra un flujo de pago Pix simulado y liquidación en MockUSDT en Polygon Amoy. No procesa fondos reales ni ofrece liquidación en USDT.'],
    ['token', 'MockUSDT y red de pruebas', 'MockUSDT es un token de prueba sin valor financiero y Polygon Amoy es una red de pruebas. Sus transacciones no representan una liquidación financiera.'],
    ['wallet', 'Billetera indicada por el cliente', 'El participante indica una billetera propia y es responsable de comprobar la dirección y la red antes de ejecutar la prueba.'],
    ['use', 'Uso aceptable', 'El sandbox debe utilizarse solamente para evaluación técnica, sin pagos comerciales, representación de saldo ni promesas a terceros.'],
    ['availability', 'Disponibilidad y cambios', 'Peragus puede modificar o interrumpir el sandbox durante el desarrollo y no presenta un SLA de producción.'],
  ],
  privacy: [
    ['site', 'Datos del sitio institucional', 'El sitio institucional no solicita documentos personales ni datos financieros. El proveedor de alojamiento puede registrar datos técnicos esenciales de acceso para seguridad y operación.'],
    ['sandbox', 'Datos del sandbox', 'Los datos de registro empresarial, credenciales y operaciones de prueba se describirán definitivamente cuando el sandbox self-service sea implementado y sometido a revisión jurídica.'],
    ['wallet', 'Billetera y transacciones públicas', 'Las direcciones y transacciones en Polygon Amoy son públicas por naturaleza. No envíes claves privadas ni frases semilla.'],
    ['contact', 'Solicitudes', 'Las solicitudes sobre datos deben utilizar únicamente un canal verificado en el dominio peragus.com.br.'],
  ],
  compliance: [
    ['environment', 'Entorno sin fondos reales', 'El sandbox actual no mueve fondos reales ni liquida USDT.'],
    ['claims', 'Sin afirmaciones regulatorias', 'Peragus no presenta licencias, certificaciones ni cobertura regulatoria que no hayan sido comprobadas y revisadas.'],
    ['future', 'Integraciones futuras', 'Una futura integración con un gateway o BaaS dependerá de la selección del proveedor, de controles operativos y de la revisión jurídica aplicable.'],
  ],
  security: [
    ['domain', 'Dominio oficial', 'El dominio institucional definido para Peragus es peragus.com.br. Confirma la dirección antes de introducir cualquier dato.'],
    ['secrets', 'Nunca compartas secretos', 'Peragus no solicita claves privadas, frases semilla ni la contraseña completa de una billetera.'],
    ['wallet', 'Comprueba billetera y red', 'En el sandbox, comprueba la dirección indicada y confirma que la red seleccionada sea Polygon Amoy.'],
    ['report', 'Comunicación de incidentes', 'Utiliza únicamente un canal de seguridad verificado en peragus.com.br cuando dicho canal esté publicado.'],
  ],
} satisfies Record<keyof LegalContent, readonly LegalRow[]>

export const esLegal = {
  terms: { ...esHeaders.terms, ...esMeta, sections: toSections(esSections.terms) },
  privacy: { ...esHeaders.privacy, ...esMeta, sections: toSections(esSections.privacy) },
  compliance: { ...esHeaders.compliance, ...esMeta, sections: toSections(esSections.compliance) },
  security: { ...esHeaders.security, ...esMeta, sections: toSections(esSections.security) },
} satisfies LegalContent
