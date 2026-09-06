// packages/core/src/pricing/priceWithDiscount.js
// Ported verbatim from client/src/utils/PriceWithDiscount.js.

export const pricewithDiscount = (price,dis = 1)=>{
    const discountAmout = Math.ceil((Number(price) * Number(dis)) / 100)
    const actualPrice = Number(price) - Number(discountAmout)
    return actualPrice
}