/**
 * RENDERER DE ÁRBOLES AAA PARA ISLA NATAL
 *
 * Mejora la calidad visual de los árboles normales, manteniendo la compatibilidad
 * con la estructura existente y respetando el estilo artístico de PIXELVERSE.
 */

export function drawHandcraftedTreeNatalAAA(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  variant: 'forest' | 'meadow' | 'pine',
  elapsed = 0,
  reducedMotion = false
): void {
  const x = Math.round(cx);
  const y = Math.round(cy);
  const canopySway = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 1.15 + cx * 0.045) * 1.25);

  ctx.save();
  ctx.translate(x, y);

  // 1. Sombra elíptica refinada
  ctx.fillStyle = 'rgba(5, 14, 10, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 30, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Elegir paleta AAA (más rica y variada)
  const isForest = variant === 'forest';
  
  // Tronco texturizado
  ctx.fillStyle = '#2d1808';
  ctx.fillRect(-6, -10, 12, 12);
  ctx.fillStyle = '#5d3a20';
  ctx.fillRect(-4, -9, 8, 10);
  ctx.fillStyle = '#8c5a30';
  ctx.fillRect(-2, -9, 3, 9);
  
  // Detalles de corteza y musgo
  ctx.fillStyle = '#1e3a1f';
  ctx.fillRect(-7, -2, 2, 4);
  ctx.fillRect(5, -2, 2, 4);

  ctx.save();
  ctx.translate(canopySway, 0);

  // Follaje AAA: Sistema de capas superpuestas
  const drawLayer = (
    yOff: number, 
    width: number, 
    height: number, 
    color: string, 
    shadow: string, 
    highlight: string
  ) => {
    // Forma orgánica
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(0, yOff, width * 0.9, height * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, yOff, width, height, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Iluminación
    ctx.fillStyle = highlight;
    ctx.beginPath();
    ctx.ellipse(-width * 0.3, yOff - height * 0.3, width * 0.5, height * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  if (variant === 'pine') {
    drawLayer(-30, 20, 15, '#1e6a5d', '#0d3d35', '#5eead4');
    drawLayer(-45, 15, 12, '#289d89', '#13675a', '#ccfbf1');
    drawLayer(-58, 10, 8, '#5eead4', '#289d89', '#ffffff');
  } else {
    // Árbol frondoso (forest o meadow)
    const baseCol = isForest ? '#166534' : '#3f7c19';
    const shadCol = isForest ? '#064e3b' : '#1f480d';
    const highCol = isForest ? '#86efac' : '#a8e63e';
    
    drawLayer(-25, 25, 18, baseCol, shadCol, highCol);
    drawLayer(-38, 22, 15, baseCol, shadCol, highCol);
    drawLayer(-50, 18, 12, highCol, baseCol, '#ffffff');
  }

  ctx.restore();
  ctx.restore();
}
