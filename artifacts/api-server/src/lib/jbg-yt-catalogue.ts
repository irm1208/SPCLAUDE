// Admin-supplied JBG/YT wholesale list. Keep these prices independent of FS3/Uther.
// SKU | Product | Supplier cost (USD) | Sell price (USD)
const source = `
50AM|5-Amino-1MQ 50mg|46|60
AHK-CU100|AHK-CU 100mg|46|50
RA10|Ara-290 16mg|48|55
BAC10|BAC water 10ml|10|15
BAC3|BAC water 3ml|7|10
BB10|BPC 10mg/TB500 (17-23) Fragment 10mg|85|90
BC10|BPC 157 10mg|35|40
BC20|BPC 157 20mg|70|85
CGL10|Cagrilintide 10mg|110|160
CGL5|Cagrilintide 5mg|70|90
CARTALAX|Cartalax 20mg|85|95
CP10|CJC No DAC / Ipa 5/5mg|68|70
DS10|DSIP 10mg|50|55
DS5|DSIP 5mg|35|35
ELORALINTIDE|Eloralintide 10mg|260|270
ET10|Epitalon 10mg|32|40
ET50|Epitalon 50mg|130|140
CU100|GHK-CU 100mg|45|55
CU50|GHK-CU 50mg|30|40
BBG70|GLOW (TB4 10mg + BPC 10mg + GHK 50mg)|90|115
IG1|IGF-1 LR3 1mg|120|150
KS10|Kisspeptin 10mg|55|65
KLOW|KLOW (TB 10mg + BPC 10mg + KPV 10mg + GHK 50mg)|135|145
KPV10|KPV 10mg|45|60
KPV30|KPV 30mg|100|125
MT1|Melanotan I 10mg|45|45
ML10|Melanotan II 10mg|45|45
MS10|Mots-C 10mg|45|55
MS20|Mots-C 20mg|90|95
MS40|Mots-C 40mg|134.40|160
NJ1000|NAD+ 1000mg|80|100
NJ500|NAD+ 500mg|60|70
PE22-28|PE-22-28 10mg|55|65
P41|PT141 10mg|50|60
RT100|Retatrutide 100mg|210|240
RT10|Retatrutide 10mg|58|70
RT20|Retatrutide 20mg|67|80
RT30|Retatrutide 30mg|88|95
RT40|Retatrutide 40mg|105|125
RT60|Retatrutide 60mg|135|155
SK10|Selank 10mg|40|55
SM10|Semaglutide 10mg|40|45
SM20|Semaglutide 20mg|75|75
SM5|Semaglutide 5mg|35|40
XA10|Semax 10mg|40|55
SMO5|Sermorelin 5mg|65|65
2S10|SS-31 10mg|60|75
2S50|SS-31 50mg|188|230
TSM10|Tesamorelin 10mg|95|120
TSM20|Tesamorelin 20mg|165|190
TR100|Tirzepatide 100mg|180|200
TR10|Tirzepatide 10mg|45|60
TR20|Tirzepatide 20mg|60|75
TR30|Tirzepatide 30mg|75|85
TR60|Tirzepatide 60mg|105|130
VIP10|VIP 10mg|100|105
`;

export const JBG_YT_CATALOGUE = source.trim().split("\n").map(line => {
  const [sku, name, cost, sell] = line.split("|");
  return { sku, name, wholesaleCost: Number(cost).toFixed(2), wholesalePrice: Number(sell).toFixed(2), stock: 100000 };
});

export function isJbgYtVendor(name: string) {
  return name.trim().toLowerCase().replace(/\s/g, "") === "jbg/yt";
}

export function jbgYtProductId(vendorId: string, sku: string) {
  return `jbg-yt:${vendorId}:${sku}`;
}
