
-- 1. Cấp mã cho toàn bộ sản phẩm theo ngày tạo.
WITH numbered_products AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            ORDER BY "createdAt" ASC, id ASC
        ) AS row_num
    FROM public."Product"
)
UPDATE public."Product" AS p
SET "productCode" = 'SP' || LPAD(np.row_num::TEXT, 5, '0')
FROM numbered_products AS np
WHERE p.id = np.id;

-- 2. Cấp SKU cho từng biến thể theo sản phẩm.
WITH numbered_variants AS (
    SELECT
        v.id,
        p."productCode",
        ROW_NUMBER() OVER (
            PARTITION BY v."productId"
            ORDER BY v."createdAt" ASC, v.id ASC
        ) AS row_num
    FROM public."ProductVariant" AS v
    JOIN public."Product" AS p
        ON p.id = v."productId"
)
UPDATE public."ProductVariant" AS v
SET "sku" = nv."productCode" || '-V' || LPAD(nv.row_num::TEXT, 3, '0')
FROM numbered_variants AS nv
WHERE v.id = nv.id;

-- 3. Chuyển hai cột thành bắt buộc.
ALTER TABLE public."Product"
ALTER COLUMN "productCode" SET NOT NULL;

ALTER TABLE public."ProductVariant"
ALTER COLUMN "sku" SET NOT NULL;
