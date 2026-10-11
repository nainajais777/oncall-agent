const crops = { wheat: { name: 'Wheat', waterNeedMm: 450 } };

export function irrigationLitres(cropId, areaHa) {
  const crop = crops[cropId];
  return crop.water.needMm * areaHa * 10000;  
}