const camelCaseToTitleCase = (text) => {
  if (!text) return '';
  return text
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, (str) => str.toUpperCase()); // Capitalize the first letter
};

export const seedSRDs = [
  {
    refNo: "SRD-2025-001",
    title: "Classic Denim Jeans",
    images: ["/uploads/1762258000065-blue-jeans-isolated-white-34440719.webp"],
    createdBy: {
      id: "vmd@demo.com",
      name: "VMD Manager",
      role: "vmd"
    },
    status: {
      vmd: "approved",
      cad: "in-progress",
      commercial: "pending",
      mmc: "pending"
    },
    dynamicFields: [
      { name: "Brand", slug: "brand", value: "Fashion Co.", department: "vmd", type: "text" },
      { name: "Sample Type", slug: "sample-type", value: "Proto", department: "vmd", type: "text" },
      { name: "Style", slug: "style", value: "FC-2025-001", department: "vmd", type: "text" },
      { name: "Description", slug: "description", value: "Regular fit classic denim jeans with vintage wash", department: "vmd", type: "text" },
      { name: "Size", slug: "size", value: "32", department: "vmd", type: "text" },
      { name: "QTY/PCS", slug: "quantity", value: 2, department: "vmd", type: "number" },
      { name: "Color/Wash", slug: "color-wash", value: "Medium Blue", department: "vmd", type: "text" },
      { name: "Fabric", slug: "fabric", value: "Denim", department: "vmd", type: "text" },
      { name: "Sample Raise Date", slug: "sample-raise-date", value: new Date("2025-10-15"), department: "vmd", type: "date" },
      { name: "ETD", slug: "etd", value: new Date("2025-11-15"), department: "vmd", type: "date" },
      { name: "Inquiry Status", slug: "inquiry-status", value: "New Inquiry", department: "commercial", type: "text" },
      { name: "CU", slug: "cu", value: "CU-001", department: "commercial", type: "text" },

      // Other vmdFields
      { name: "Wash Comments", slug: "wash-comments", value: "Vintage effect with whiskers", department: "vmd", type: "text" },
      { name: "Costing Required", slug: "costing-required", value: "Yes", department: "vmd", type: "text" },
      { name: "Garment Construction", slug: "garment-construction", value: "5 Pocket", department: "vmd", type: "text" },
      { name: "Fly Details", slug: "fly-details", value: "Zip Fly", department: "vmd", type: "text" },
      { name: "Fly Opening Length", slug: "fly-opening-length", value: "18cm", department: "vmd", type: "text" },
      { name: "Loop Length Qty", slug: "loop-length-qty", value: "5 loops, 6cm length", department: "vmd", type: "text" },
      { name: "Loop Fusing", slug: "loop-fusing", value: "Yes", department: "vmd", type: "text" },
      { name: "Wb Fusing", slug: "wb-fusing", value: "Heavy grade", department: "vmd", type: "text" },
      { name: "Yoke Attachment", slug: "yoke-attachment", value: "Flat felled seam", department: "vmd", type: "text" },
      { name: "Back Rise Attachment", slug: "back-rise-attachment", value: "Double needle chain stitch", department: "vmd", type: "text" },
      { name: "Inseam Attachment", slug: "inseam-attachment", value: "Safety stitch", department: "vmd", type: "text" },
      { name: "Fabric Code", slug: "fabric-code", value: "DNM-001", department: "vmd", type: "text" },
      { name: "Color", slug: "color", value: "Indigo", department: "vmd", type: "text" },
      { name: "Fabric Supplier", slug: "fabric-supplier", value: "Denim Mills Inc", department: "vmd", type: "text" },
      { name: "Secondary Fabric", slug: "secondary-fabric", value: "Pocket bags - Cotton Poplin", department: "vmd", type: "text" },
      { name: "Fabric Availability", slug: "fabric-availability", value: "In Stock", department: "vmd", type: "text" },
      { name: "Add Ons", slug: "add-ons", value: "Leather patch at back", department: "vmd", type: "text" },
      
      // Before Wash Trims
      { name: "Top Thread", slug: "top-thread", value: "#40/2 Poly Core", department: "vmd", type: "text" },
      { name: "Bottom Thread", slug: "bottom-thread", value: "#60/2 Spun Poly", department: "vmd", type: "text" },
      { name: "Busted Thread", slug: "busted-thread", value: "Natural", department: "vmd", type: "text" },
      { name: "Emb Thread", slug: "emb-thread", value: "Gold", department: "vmd", type: "text" },
      { name: "Trim Availability (Before Wash)", slug: "trim-availability-before-wash", value: "All in stock", department: "vmd", type: "text" },
      { name: "Add Ons (Before Wash)", slug: "add-ons-before-wash", value: "Contrast stitching on back pockets", department: "vmd", type: "text" },
      
      // After Wash Trims
      { name: "Pu Patch", slug: "pu-patch", value: "Brown leather, debossed logo", department: "vmd", type: "text" },
      { name: "Main Button", slug: "main-button", value: "17mm Brass", department: "vmd", type: "text" },
      { name: "Main Button Color", slug: "main-button-color", value: "Antique Bronze", department: "vmd", type: "text" },
      { name: "Fly Button", slug: "fly-button", value: "14mm Brass", department: "vmd", type: "text" },
      { name: "Fly Button Color", slug: "fly-button-color", value: "Antique Bronze", department: "vmd", type: "text" },
      { name: "Rivet", slug: "rivet", value: "12mm", department: "vmd", type: "text" },
      { name: "Rivet Color", slug: "rivet-color", value: "Antique Bronze", department: "vmd", type: "text" },
      { name: "Trim Availability (After Wash)", slug: "trim-availability-after-wash", value: "All in stock", department: "vmd", type: "text" },
      { name: "Overrider", slug: "overrider", value: "None", department: "vmd", type: "text" },
      { name: "Add Ons (After Wash)", slug: "add-ons-after-wash", value: "Branded rivets", department: "vmd", type: "text" },

      // Embellishments
      { name: "Required Prints", slug: "required-prints", value: "None", department: "vmd", type: "text" },
      { name: "Print Area", slug: "print-area", value: "N/A", department: "vmd", type: "text" },
      { name: "Print Color", slug: "print-color", value: "N/A", department: "vmd", type: "text" },
      { name: "Print Artwork", slug: "print-artwork", value: "N/A", department: "vmd", type: "text" },
      { name: "Print Add Ons", slug: "print-add-ons", value: "N/A", department: "vmd", type: "text" },
      { name: "Required Embroidery", slug: "required-embroidery", value: "Back pocket design", department: "vmd", type: "text" },
      { name: "Embroidery Area", slug: "embroidery-area", value: "Back pockets", department: "vmd", type: "text" },
      { name: "Embroidery Color", slug: "embroidery-color", value: "Gold thread", department: "vmd", type: "text" },
      { name: "Embroidery Artwork", slug: "embroidery-artwork", value: "Arcuate design", department: "vmd", type: "text" },
      { name: "Embroidery Add Ons", slug: "embroidery-add-ons", value: "Double thickness backing", department: "vmd", type: "text" },
      
      // CAD Fields
      { name: "Consumption", slug: "consumption", value: "1.5m", department: "cad", type: "text" },
      { name: "Roll No", slug: "roll-no", value: "R-001", department: "cad", type: "text" },
      { name: "Shrinkage", slug: "shrinkage", value: "3%", department: "cad", type: "text" },
      { name: "Width", slug: "width", value: "58 inches", department: "cad", type: "text" },
      { name: "Belt Tracing", slug: "belt-tracing", value: "Standard 5cm width", department: "cad", type: "text" },
      { name: "Consumption Width", slug: "consumption-width", value: "150cm", department: "cad", type: "text" },

      // Commercial Fields
      { name: "Required Qty", slug: "required-qty", value: "500", department: "commercial", type: "text" },
      { name: "Fabric In Stock", slug: "fabric-in-stock", value: true, department: "commercial", type: "boolean" },
      { name: "Order Placed Date", slug: "order-placed-date", value: new Date("2025-10-20"), department: "commercial", type: "date" },
      { name: "Fabric Received Date", slug: "fabric-received-date", value: new Date("2025-10-30"), department: "commercial", type: "date" },
      { name: "Before Wash Trims In Stock", slug: "before-wash-trims-in-stock", value: true, department: "commercial", type: "boolean" },
      { name: "Before Wash Trims Order Placed Date", slug: "before-wash-trims-order-placed-date", value: new Date("2025-10-21"), department: "commercial", type: "date" },
      { name: "Before Wash Trims Received Date", slug: "before-wash-trims-received-date", value: new Date("2025-10-28"), department: "commercial", type: "date" },
      { name: "After Wash Trims In Stock", slug: "after-wash-trims-in-stock", value: true, department: "commercial", type: "boolean" },
      { name: "After Wash Trims Order Placed Date", slug: "after-wash-trims-order-placed-date", value: new Date("2025-10-21"), department: "commercial", type: "date" },
      { name: "After Wash Trims Received Date", slug: "after-wash-trims-received-date", value: new Date("2025-10-28"), department: "commercial", type: "date" },
      { name: "Embellishments In Stock", slug: "embellishments-in-stock", value: true, department: "commercial", type: "boolean" },
      { name: "Embellishments Order Placed Date", slug: "embellishments-order-placed-date", value: new Date("2025-10-22"), department: "commercial", type: "date" },
      { name: "Embellishments Received Date", slug: "embellishments-received-date", value: new Date("2025-10-29"), department: "commercial", type: "date" },
      { name: "Additional Comments", slug: "additional-comments", value: "Rush order for key account", department: "commercial", type: "text" },
      { name: "Sample Dispatch Date", slug: "sample-dispatch-date", value: "2025-11-15", department: "commercial", type: "text" },
      { name: "Number Of Samples", slug: "number-of-samples", value: "2", department: "commercial", type: "text" },
      { name: "Samples Checked By", slug: "samples-checked-by", value: "QC Team Lead", department: "commercial", type: "text" },
      { name: "Awb Number", slug: "awb-number", value: "AWB123456789", department: "commercial", type: "text" },

      // MMC Fields
      { name: "Trim In Stock", slug: "trim-in-stock", value: "Yes", department: "mmc", type: "text" },
      { name: "Order Placed", slug: "order-placed", value: "Yes", department: "mmc", type: "text" },
      { name: "Order Placed Date", slug: "order-placed-date", value: "2025-10-25", department: "mmc", type: "text" },
      { name: "Trim Received Date", slug: "trim-received-date", value: "2025-11-01", department: "mmc", type: "text" },
      { name: "Material Sent Date", slug: "material-sent-date", value: "2025-11-02", department: "mmc", type: "text" },
      { name: "Material Received Date", slug: "material-received-date", value: "2025-11-03", department: "mmc", type: "text" },
    ],
    audit: [
      {
        action: "SRD Created",
        department: "vmd",
        author: "VMD Manager",
        timestamp: new Date(Date.now() - 86400000 * 5),
        details: {},
      }
    ],
    comments: [
      {
        department: "vmd",
        author: "VMD Manager",
        role: "vmd",
        text: "Initial design brief submitted with vintage wash requirement",
        date: new Date(Date.now() - 86400000 * 4.5),
      }
    ]
  },
  {
    refNo: "SRD-2025-002",
    title: "Cargo Pants",
    createdBy: {
      id: "vmd@demo.com",
      name: "VMD Manager",
      role: "vmd"
    },
    status: {
      vmd: "approved",
      cad: "approved",
      commercial: "in-progress",
      mmc: "pending"
    },
    dynamicFields: [
      { name: "Brand", slug: "brand", value: "Urban Wear", department: "vmd", type: "text" },
      { name: "Sample Type", slug: "sample-type", value: "Size Set", department: "vmd", type: "text" },
      { name: "Style", slug: "style", value: "UW-2025-002", department: "vmd", type: "text" },
      { name: "Description", slug: "description", value: "Military-style cargo pants with multiple pockets", department: "vmd", type: "text" },
      { name: "Size", slug: "size", value: "34", department: "vmd", type: "text" },
      { name: "QTY/PCS", slug: "quantity", value: 3, department: "vmd", type: "number" },
      { name: "Color/Wash", slug: "color-wash", value: "Olive Green", department: "vmd", type: "text" },
      { name: "Fabric", slug: "fabric", value: "Twill", department: "vmd", type: "text" },
      { name: "Sample Raise Date", slug: "sample-raise-date", value: new Date("2025-10-20"), department: "vmd", type: "date" },
      { name: "ETD", slug: "etd", value: new Date("2025-11-20"), department: "vmd", type: "date" },
      { name: "Inquiry Status", slug: "inquiry-status", value: "Follow-up", department: "commercial", type: "text" },
      { name: "CU", slug: "cu", value: "CU-002", department: "commercial", type: "text" },

      // Other vmdFields
      { name: "Wash Comments", slug: "wash-comments", value: "Light enzyme wash", department: "vmd", type: "text" },
      { name: "Costing Required", slug: "costing-required", value: "Yes", department: "vmd", type: "text" },
      { name: "Garment Construction", slug: "garment-construction", value: "Cargo style", department: "vmd", type: "text" },
      { name: "Fly Details", slug: "fly-details", value: "Button Fly", department: "vmd", type: "text" },
      { name: "Fly Opening Length", slug: "fly-opening-length", value: "20cm", department: "vmd", type: "text" },
      { name: "Loop Length Qty", slug: "loop-length-qty", value: "7 loops, 7cm length", department: "vmd", type: "text" },
      { name: "Loop Fusing", slug: "loop-fusing", value: "Medium weight", department: "vmd", type: "text" },
      { name: "Wb Fusing", slug: "wb-fusing", value: "Medium grade", department: "vmd", type: "text" },
      { name: "Yoke Attachment", slug: "yoke-attachment", value: "Double needle", department: "vmd", type: "text" },
      { name: "Back Rise Attachment", slug: "back-rise-attachment", value: "Safety stitch", department: "vmd", type: "text" },
      { name: "Inseam Attachment", slug: "inseam-attachment", value: "Chain stitch", department: "vmd", type: "text" },
      { name: "Fabric Code", slug: "fabric-code", value: "TWL-002", department: "vmd", type: "text" },
      { name: "Color", slug: "color", value: "Olive", department: "vmd", type: "text" },
      { name: "Fabric Supplier", slug: "fabric-supplier", value: "Textile Pro", department: "vmd", type: "text" },
      { name: "Secondary Fabric", slug: "secondary-fabric", value: "Pocket bags - Cotton Twill", department: "vmd", type: "text" },
      { name: "Fabric Availability", slug: "fabric-availability", value: "In Stock", department: "vmd", type: "text" },
      { name: "Add Ons", slug: "add-ons", value: "Reinforced knee panels", department: "vmd", type: "text" },

      // Before Wash Trims
      { name: "Top Thread", slug: "top-thread", value: "#30/2 Poly Core", department: "vmd", type: "text" },
      { name: "Bottom Thread", slug: "bottom-thread", value: "#50/2 Spun Poly", department: "vmd", type: "text" },
      { name: "Busted Thread", slug: "busted-thread", value: "Olive", department: "vmd", type: "text" },
      { name: "Emb Thread", slug: "emb-thread", value: "Matching", department: "vmd", type: "text" },
      { name: "Trim Availability (Before Wash)", slug: "trim-availability-before-wash", value: "All in stock", department: "vmd", type: "text" },
      { name: "Add Ons (Before Wash)", slug: "add-ons-before-wash", value: "Double stitching on cargo pockets", department: "vmd", type: "text" },

      // After Wash Trims
      { name: "Pu Patch", slug: "pu-patch", value: "Canvas patch, printed logo", department: "vmd", type: "text" },
      { name: "Main Button", slug: "main-button", value: "20mm Metal", department: "vmd", type: "text" },
      { name: "Main Button Color", slug: "main-button-color", value: "Gunmetal", department: "vmd", type: "text" },
      { name: "Fly Button", slug: "fly-button", value: "17mm Metal", department: "vmd", type: "text" },
      { name: "Fly Button Color", slug: "fly-button-color", value: "Gunmetal", department: "vmd", type: "text" },
      { name: "Rivet", slug: "rivet", value: "14mm", department: "vmd", type: "text" },
      { name: "Rivet Color", slug: "rivet-color", value: "Gunmetal", department: "vmd", type: "text" },
      { name: "Trim Availability (After Wash)", slug: "trim-availability-after-wash", value: "Partial stock", department: "vmd", type: "text" },
      { name: "Overrider", slug: "overrider", value: "None", department: "vmd", type: "text" },
      { name: "Add Ons (After Wash)", slug: "add-ons-after-wash", value: "Utility D-rings", department: "vmd", type: "text" },
      
      // Embellishments
      { name: "Required Prints", slug: "required-prints", value: "Logo print", department: "vmd", type: "text" },
      { name: "Print Area", slug: "print-area", value: "Cargo pocket", department: "vmd", type: "text" },
      { name: "Print Color", slug: "print-color", value: "Black", department: "vmd", type: "text" },
      { name: "Print Artwork", slug: "print-artwork", value: "Brand logo", department: "vmd", type: "text" },
      { name: "Print Add Ons", slug: "print-add-ons", value: "3M reflective print", department: "vmd", type: "text" },
      { name: "Required Embroidery", slug: "required-embroidery", value: "None", department: "vmd", type: "text" },
      { name: "Embroidery Area", slug: "embroidery-area", value: "N/A", department: "vmd", type: "text" },
      { name: "Embroidery Color", slug: "embroidery-color", value: "N/A", department: "vmd", type: "text" },
      { name: "Embroidery Artwork", slug: "embroidery-artwork", value: "N/A", department: "vmd", type: "text" },
      { name: "Embroidery Add Ons", slug: "embroidery-add-ons", value: "N/A", department: "vmd", type: "text" },

      // CAD Fields
      { name: "Consumption", slug: "consumption", value: "2.0m", department: "cad", type: "text" },
      { name: "Roll No", slug: "roll-no", value: "R-002", department: "cad", type: "text" },
      { name: "Shrinkage", slug: "shrinkage", value: "2.5%", department: "cad", type: "text" },
      { name: "Width", slug: "width", value: "60 inches", department: "cad", type: "text" },
      { name: "Belt Tracing", slug: "belt-tracing", value: "Wide 6cm belt", department: "cad", type: "text" },
      { name: "Consumption Width", slug: "consumption-width", value: "152cm", department: "cad", type: "text" },

      // Commercial Fields
      { name: "Required Qty", slug: "required-qty", value: "750", department: "commercial", type: "text" },
      { name: "Fabric In Stock", slug: "fabric-in-stock", value: true, department: "commercial", type: "boolean" },
      { name: "Order Placed Date", slug: "order-placed-date", value: new Date("2025-10-25"), department: "commercial", type: "date" },
      { name: "Fabric Received Date", slug: "fabric-received-date", value: new Date("2025-11-05"), department: "commercial", type: "date" },
      { name: "Before Wash Trims In Stock", slug: "before-wash-trims-in-stock", value: true, department: "commercial", type: "boolean" },
      { name: "Before Wash Trims Order Placed Date", slug: "before-wash-trims-order-placed-date", value: new Date("2025-10-26"), department: "commercial", type: "date" },
      { name: "Before Wash Trims Received Date", slug: "before-wash-trims-received-date", value: new Date("2025-11-02"), department: "commercial", type: "date" },
      { name: "After Wash Trims In Stock", slug: "after-wash-trims-in-stock", value: false, department: "commercial", type: "boolean" },
      { name: "After Wash Trims Order Placed Date", slug: "after-wash-trims-order-placed-date", value: new Date("2025-10-26"), department: "commercial", type: "date" },
      { name: "After Wash Trims Received Date", slug: "after-wash-trims-received-date", value: null, department: "commercial", type: "date" },
      { name: "Embellishments In Stock", slug: "embellishments-in-stock", value: true, department: "commercial", type: "boolean" },
      { name: "Embellishments Order Placed Date", slug: "embellishments-order-placed-date", value: new Date("2025-10-27"), department: "commercial", type: "date" },
      { name: "Embellishments Received Date", slug: "embellishments-received-date", value: new Date("2025-11-03"), department: "commercial", type: "date" },
      { name: "Additional Comments", slug: "additional-comments", value: "Waiting for gunmetal buttons", department: "commercial", type: "text" },
      { name: "Sample Dispatch Date", slug: "sample-dispatch-date", value: "2025-11-25", department: "commercial", type: "text" },
      { name: "Number Of Samples", slug: "number-of-samples", value: "3", department: "commercial", type: "text" },
      { name: "Samples Checked By", slug: "samples-checked-by", value: "Quality Manager", department: "commercial", type: "text" },
      { name: "Awb Number", slug: "awb-number", value: "AWB987654321", department: "commercial", type: "text" },

      // MMC Fields
      { name: "Trim In Stock", slug: "trim-in-stock", value: "Partial", department: "mmc", type: "text" },
      { name: "Order Placed", slug: "order-placed", value: "Yes", department: "mmc", type: "text" },
      { name: "Order Placed Date", slug: "order-placed-date", value: "2025-10-30", department: "mmc", type: "text" },
      { name: "Trim Received Date", slug: "trim-received-date", value: "2025-11-07", department: "mmc", type: "text" },
      { name: "Material Sent Date", slug: "material-sent-date", value: "2025-11-08", department: "mmc", type: "text" },
      { name: "Material Received Date", slug: "material-received-date", value: "2025-11-10", department: "mmc", type: "text" },
    ],
    audit: [
      {
        action: "SRD Created",
        department: "vmd",
        author: "VMD Manager",
        timestamp: new Date(Date.now() - 86400000 * 10),
        details: {},
      }
    ]
  },
  {
    refNo: "SRD-2025-003",
    title: "Slim Fit Chinos",
    createdBy: {
      id: "vmd@demo.com",
      name: "VMD Manager",
      role: "vmd"
    },
    status: {
      vmd: "approved",
      cad: "approved",
      commercial: "approved",
      mmc: "in-progress"
    },
    dynamicFields: [
      { name: "Brand", slug: "brand", value: "Modern Basics", department: "vmd", type: "text" },
      { name: "Sample Type", slug: "sample-type", value: "Production", department: "vmd", type: "text" },
      { name: "Style", slug: "style", value: "MB-2025-003", department: "vmd", type: "text" },
      { name: "Description", slug: "description", value: "Modern slim fit chinos with stretch fabric", department: "vmd", type: "text" },
      { name: "Size", slug: "size", value: "30", department: "vmd", type: "text" },
      { name: "QTY/PCS", slug: "quantity", value: 2, department: "vmd", type: "number" },
      { name: "Color/Wash", slug: "color-wash", value: "Khaki", department: "vmd", type: "text" },
      { name: "Fabric", slug: "fabric", value: "Cotton Stretch", department: "vmd", type: "text" },
      { name: "Sample Raise Date", slug: "sample-raise-date", value: new Date("2025-10-25"), department: "vmd", type: "date" },
      { name: "ETD", slug: "etd", value: new Date("2025-11-25"), department: "vmd", type: "date" },
      { name: "Inquiry Status", slug: "inquiry-status", value: "In Production", department: "commercial", type: "text" },
      { name: "CU", slug: "cu", value: "CU-003", department: "commercial", type: "text" },

      // Other vmdFields
      { name: "Fabric Code", slug: "fabric-code", value: "CHN-003", department: "vmd", type: "text" },
      { name: "Color", slug: "color", value: "Khaki", department: "vmd", type: "text" },
      { name: "Fabric Supplier", slug: "fabric-supplier", value: "Cotton Plus", department: "vmd", type: "text" },

      // CAD Fields
      { name: "Consumption", slug: "consumption", value: "1.3m", department: "cad", type: "text" },
      { name: "Roll No", slug: "roll-no", value: "R-003", department: "cad", type: "text" },
      { name: "Shrinkage", slug: "shrinkage", value: "2%", department: "cad", type: "text" },
      { name: "Width", slug: "width", value: "60 inches", department: "cad", type: "text" },
    ]
  },
  {
    refNo: "SRD-2025-004",
    title: "Distressed Denim",
    createdBy: {
      id: "vmd@demo.com",
      name: "VMD Manager",
      role: "vmd"
    },
    status: {
      vmd: "flagged",
      cad: "pending",
      commercial: "pending",
      mmc: "pending"
    },
    dynamicFields: [
      { name: "Brand", slug: "brand", value: "Street Style Co", department: "vmd", type: "text" },
      { name: "Sample Type", slug: "sample-type", value: "Proto", department: "vmd", type: "text" },
      { name: "Style", slug: "style", value: "SS-2025-004", department: "vmd", type: "text" },
      { name: "Description", slug: "description", value: "Heavily distressed denim with rips and repairs", department: "vmd", type: "text" },
      { name: "Size", slug: "size", value: "28", department: "vmd", type: "text" },
      { name: "QTY/PCS", slug: "quantity", value: 1, department: "vmd", type: "number" },
      { name: "Color/Wash", slug: "color-wash", value: "Light Blue", department: "vmd", type: "text" },
      { name: "Fabric", slug: "fabric", value: "Denim", department: "vmd", type: "text" },
      { name: "Sample Raise Date", slug: "sample-raise-date", value: new Date("2025-11-01"), department: "vmd", type: "date" },
      { name: "ETD", slug: "etd", value: new Date("2025-12-01"), department: "vmd", type: "date" },
      { name: "Inquiry Status", slug: "inquiry-status", value: "On Hold", department: "commercial", type: "text" },
      { name: "CU", slug: "cu", value: "CU-004", department: "commercial", type: "text" },

      // Other vmdFields
      { name: "Wash Comments", slug: "wash-comments", value: "Heavy distressing required", department: "vmd", type: "text" },
      { name: "Fabric Code", slug: "fabric-code", value: "DNM-004", department: "vmd", type: "text" },
      { name: "Color", slug: "color", value: "Light Blue", department: "vmd", type: "text" },
      { name: "Fabric Supplier", slug: "fabric-supplier", value: "Denim Masters", department: "vmd", type: "text" },
    ]
  },
  {
    refNo: "SRD-2025-005",
    title: "Work Pants",
    createdBy: {
      id: "vmd@demo.com",
      name: "VMD Manager",
      role: "vmd"
    },
    status: {
      vmd: "approved",
      cad: "approved",
      commercial: "approved",
      mmc: "approved"
    },
    dynamicFields: [
      { name: "Brand", slug: "brand", value: "WorkWear Pro", department: "vmd", type: "text" },
      { name: "Sample Type", slug: "sample-type", value: "Production", department: "vmd", type: "text" },
      { name: "Style", slug: "style", value: "WW-2025-005", department: "vmd", type: "text" },
      { name: "Description", slug: "description", value: "Heavy-duty work pants with reinforced knees", department: "vmd", type: "text" },
      { name: "Size", slug: "size", value: "36", department: "vmd", type: "text" },
      { name: "QTY/PCS", slug: "quantity", value: 4, department: "vmd", type: "number" },
      { name: "Color/Wash", slug: "color-wash", value: "Navy", department: "vmd", type: "text" },
      { name: "Fabric", slug: "fabric", value: "Canvas", department: "vmd", type: "text" },
      { name: "Sample Raise Date", slug: "sample-raise-date", value: new Date("2025-11-05"), department: "vmd", type: "date" },
      { name: "ETD", slug: "etd", value: new Date("2025-12-05"), department: "vmd", type: "date" },
      { name: "Inquiry Status", slug: "inquiry-status", value: "Completed", department: "commercial", type: "text" },
      { name: "CU", slug: "cu", value: "CU-005", department: "commercial", type: "text" },

      // Other vmdFields
      { name: "Fabric Code", slug: "fabric-code", value: "CNV-005", department: "vmd", type: "text" },
      { name: "Color", slug: "color", value: "Navy", department: "vmd", type: "text" },
      { name: "Fabric Supplier", slug: "fabric-supplier", value: "Industrial Textiles", department: "vmd", type: "text" },

      // Commercial Fields
      { name: "Required Qty", slug: "required-qty", value: "1000", department: "commercial", type: "text" },
      { name: "Fabric In Stock", slug: "fabric-in-stock", value: true, department: "commercial", type: "boolean" },
      { name: "Order Placed Date", slug: "order-placed-date", value: new Date("2025-11-10"), department: "commercial", type: "date" },
      { name: "Fabric Received Date", slug: "fabric-received-date", value: new Date("2025-11-20"), department: "commercial", type: "date" },
    ]
  },
  {
    refNo: "SRD-2025-006",
    title: "Cropped Pants",
    createdBy: {
      id: "vmd@demo.com",
      name: "VMD Manager",
      role: "vmd"
    },
    status: {
      vmd: "in-progress",
      cad: "pending",
      commercial: "pending",
      mmc: "pending"
    },
    dynamicFields: [
      { name: "Brand", slug: "brand", value: "Fashion Forward", department: "vmd", type: "text" },
      { name: "Sample Type", slug: "sample-type", value: "Proto", department: "vmd", type: "text" },
      { name: "Style", slug: "style", value: "FF-2025-006", department: "vmd", type: "text" },
      { name: "Description", slug: "description", value: "Trendy cropped pants with wide leg", department: "vmd", type: "text" },
      { name: "Size", slug: "size", value: "29", department: "vmd", type: "text" },
      { name: "QTY/PCS", slug: "quantity", value: 2, department: "vmd", type: "number" },
      { name: "Color/Wash", slug: "color-wash", value: "Black", department: "vmd", type: "text" },
      { name: "Fabric", slug: "fabric", value: "Linen Blend", department: "vmd", type: "text" },
      { name: "Sample Raise Date", slug: "sample-raise-date", value: new Date("2025-11-10"), department: "vmd", type: "date" },
      { name: "ETD", slug: "etd", value: new Date("2025-12-10"), department: "vmd", type: "date" },
      { name: "Inquiry Status", slug: "inquiry-status", value: "New", department: "commercial", type: "text" },
      { name: "CU", slug: "cu", value: "CU-006", department: "commercial", type: "text" },

      // Other vmdFields
      { name: "Fit", slug: "fit", value: "Wide Leg", department: "vmd", type: "text" },
      { name: "Fabric Code", slug: "fabric-code", value: "LIN-006", department: "vmd", type: "text" },
      { name: "Color", slug: "color", value: "Black", department: "vmd", type: "text" },
      { name: "Fabric Supplier", slug: "fabric-supplier", value: "Linen Co", department: "vmd", type: "text" },
    ]
  },
  {
    refNo: "SRD-2025-007",
    title: "Performance Track Pants",
    createdBy: {
      id: "vmd@demo.com",
      name: "VMD Manager",
      role: "vmd"
    },
    status: {
      vmd: "approved",
      cad: "approved",
      commercial: "flagged",
      mmc: "pending"
    },
    dynamicFields: [
      { name: "Brand", slug: "brand", value: "Sports Elite", department: "vmd", type: "text" },
      { name: "Sample Type", slug: "sample-type", value: "Size Set", department: "vmd", type: "text" },
      { name: "Style", slug: "style", value: "SE-2025-007", department: "vmd", type: "text" },
      { name: "Description", slug: "description", value: "Athletic track pants with moisture-wicking fabric", department: "vmd", type: "text" },
      { name: "Size", slug: "size", value: "M", department: "vmd", type: "text" },
      { name: "QTY/PCS", slug: "quantity", value: 3, department: "vmd", type: "number" },
      { name: "Color/Wash", slug: "color-wash", value: "Charcoal", department: "vmd", type: "text" },
      { name: "Fabric", slug: "fabric", value: "Performance Polyester", department: "vmd", type: "text" },
      { name: "Sample Raise Date", slug: "sample-raise-date", value: new Date("2025-11-15"), department: "vmd", type: "date" },
      { name: "ETD", slug: "etd", value: new Date("2025-12-15"), department: "vmd", type: "date" },
      { name: "Inquiry Status", slug: "inquiry-status", value: "Flagged", department: "commercial", type: "text" },
      { name: "CU", slug: "cu", value: "CU-007", department: "commercial", type: "text" },

      // Other vmdFields
      { name: "Fit", slug: "fit", value: "Athletic", department: "vmd", type: "text" },
      { name: "Fabric Code", slug: "fabric-code", value: "PFM-007", department: "vmd", type: "text" },
      { name: "Color", slug: "color", value: "Charcoal", department: "vmd", type: "text" },
      { name: "Fabric Supplier", slug: "fabric-supplier", value: "Tech Textiles", department: "vmd", type: "text" },
    ]
  },
  {
    refNo: "SRD-2025-008",
    title: "High-Rise Jeans",
    createdBy: {
      id: "vmd@demo.com",
      name: "VMD Manager",
      role: "vmd"
    },
    status: {
      vmd: "approved",
      cad: "in-progress",
      commercial: "pending",
      mmc: "pending"
    },
    dynamicFields: [
      { name: "Brand", slug: "brand", value: "Vintage Vibes", department: "vmd", type: "text" },
      { name: "Sample Type", slug: "sample-type", value: "Proto", department: "vmd", type: "text" },
      { name: "Style", slug: "style", value: "VV-2025-008", department: "vmd", type: "text" },
      { name: "Description", slug: "description", value: "90s inspired high-rise straight leg jeans", department: "vmd", type: "text" },
      { name: "Size", slug: "size", value: "27", department: "vmd", type: "text" },
      { name: "QTY/PCS", slug: "quantity", value: 2, department: "vmd", type: "number" },
      { name: "Color/Wash", slug: "color-wash", value: "Medium Stone", department: "vmd", type: "text" },
      { name: "Fabric", slug: "fabric", value: "Rigid Denim", department: "vmd", type: "text" },
      { name: "Sample Raise Date", slug: "sample-raise-date", value: new Date("2025-11-20"), department: "vmd", type: "date" },
      { name: "ETD", slug: "etd", value: new Date("2025-12-20"), department: "vmd", type: "date" },
      { name: "Inquiry Status", slug: "inquiry-status", value: "Pending Approval", department: "commercial", type: "text" },
      { name: "CU", slug: "cu", value: "CU-008", department: "commercial", type: "text" },

      // Other vmdFields
      { name: "Wash Comments", slug: "wash-comments", value: "Vintage fade required", department: "vmd", type: "text" },
      { name: "Fit", slug: "fit", value: "High Rise Straight", department: "vmd", type: "text" },
      { name: "Fabric Code", slug: "fabric-code", value: "DNM-008", department: "vmd", type: "text" },
      { name: "Color", slug: "color", value: "Indigo", department: "vmd", type: "text" },
      { name: "Fabric Supplier", slug: "fabric-supplier", value: "Heritage Denim", department: "vmd", type: "text" },
    ]
  },
  {
    refNo: "SRD-2025-009",
    title: "Jogger Pants",
    createdBy: {
      id: "vmd@demo.com",
      name: "VMD Manager",
      role: "vmd"
    },
    status: {
      vmd: "approved",
      cad: "approved",
      commercial: "approved",
      mmc: "in-progress"
    },
    dynamicFields: [
      { name: "Brand", slug: "brand", value: "Casual Comfort", department: "vmd", type: "text" },
      { name: "Sample Type", slug: "sample-type", value: "Production", department: "vmd", type: "text" },
      { name: "Style", slug: "style", value: "CC-2025-009", department: "vmd", type: "text" },
      { name: "Description", slug: "description", value: "Casual jogger pants with elastic cuffs", department: "vmd", type: "text" },
      { name: "Size", slug: "size", value: "L", department: "vmd", type: "text" },
      { name: "QTY/PCS", slug: "quantity", value: 3, department: "vmd", type: "number" },
      { name: "Color/Wash", slug: "color-wash", value: "Grey Melange", department: "vmd", type: "text" },
      { name: "Fabric", slug: "fabric", value: "French Terry", department: "vmd", type: "text" },
      { name: "Sample Raise Date", slug: "sample-raise-date", value: new Date("2025-11-25"), department: "vmd", type: "date" },
      { name: "ETD", slug: "etd", value: new Date("2025-12-25"), department: "vmd", type: "date" },
      { name: "Inquiry Status", slug: "inquiry-status", value: "Material Ready", department: "commercial", type: "text" },
      { name: "CU", slug: "cu", value: "CU-009", department: "commercial", type: "text" },

      // Other vmdFields
      { name: "Fit", slug: "fit", value: "Relaxed", department: "vmd", type: "text" },
      { name: "Fabric Code", slug: "fabric-code", value: "FLE-009", department: "vmd", type: "text" },
      { name: "Color", slug: "color", value: "Grey", department: "vmd", type: "text" },
      { name: "Fabric Supplier", slug: "fabric-supplier", value: "Knit Pro", department: "vmd", type: "text" },

      // MMC Fields
      { name: "Trim In Stock", slug: "trim-in-stock", value: "Yes", department: "mmc", type: "text" },
      { name: "Order Placed", slug: "order-placed", value: "Yes", department: "mmc", type: "text" },
      { name: "Order Placed Date", slug: "order-placed-date", value: "2025-11-26", department: "mmc", type: "text" },
      { name: "Material Sent Date", slug: "material-sent-date", value: "2025-11-28", department: "mmc", type: "text" },
    ]
  },
  {
    refNo: "SRD-2025-010",
    title: "Carpenter Pants",
    createdBy: {
      id: "vmd@demo.com",
      name: "VMD Manager",
      role: "vmd"
    },
    status: {
      vmd: "pending",
      cad: "pending",
      commercial: "pending",
      mmc: "pending"
    },
    dynamicFields: [
      { name: "Brand", slug: "brand", value: "Work Master", department: "vmd", type: "text" },
      { name: "Sample Type", slug: "sample-type", value: "Proto", department: "vmd", type: "text" },
      { name: "Style", slug: "style", value: "WM-2025-010", department: "vmd", type: "text" },
      { name: "Description", slug: "description", value: "Utility carpenter pants with tool pockets", department: "vmd", type: "text" },
      { name: "Size", slug: "size", value: "34", department: "vmd", type: "text" },
      { name: "QTY/PCS", slug: "quantity", value: 2, department: "vmd", type: "number" },
      { name: "Color/Wash", slug: "color-wash", value: "Tan", department: "vmd", type: "text" },
      { name: "Fabric", slug: "fabric", value: "Duck Canvas", department: "vmd", type: "text" },
      { name: "Sample Raise Date", slug: "sample-raise-date", value: new Date("2025-11-30"), department: "vmd", type: "date" },
      { name: "ETD", slug: "etd", value: new Date("2025-12-30"), department: "vmd", type: "date" },
      { name: "Inquiry Status", slug: "inquiry-status", value: "Pending Review", department: "commercial", type: "text" },
      { name: "CU", slug: "cu", value: "CU-010", department: "commercial", type: "text" },

      // Other vmdFields
      { name: "Fit", slug: "fit", value: "Loose", department: "vmd", type: "text" },
      { name: "Fabric Code", slug: "fabric-code", value: "DCK-010", department: "vmd", type: "text" },
      { name: "Color", slug: "color", value: "Tan", department: "vmd", type: "text" },
      { name: "Fabric Supplier", slug: "fabric-supplier", value: "Work Textile Co", department: "vmd", type: "text" },
    ]
  },
  {
    refNo: "SRD-2025-011",
    title: "Vintage Wash Jeans",
    images: ["/uploads/1762258000131-clothing-concepts-pair-new-mans-blue-jeans-trousers-placed-flat-over-pure-white-background-vertical-image-composition-374023011.webp", "/uploads/1762800528505-men-s-blue-ripped-slim-fit-jeans-523336-1658740654-2.webp"],
    createdBy: {
      id: "cad@demo.com",
      name: "CAD Designer",
      role: "cad"
    },
    status: {
      vmd: "approved",
      cad: "approved",
      commercial: "approved",
      mmc: "completed"
    },
    dynamicFields: [
      { name: "Brand", slug: "brand", value: "Retro Apparel", department: "vmd", type: "text" },
      { name: "Sample Type", slug: "sample-type", value: "Production", department: "vmd", type: "text" },
      { name: "Style", slug: "style", value: "RA-2025-011", department: "vmd", type: "text" },
      { name: "Description", slug: "description", value: "High-waisted jeans with heavy vintage wash and minimal distressing", department: "vmd", type: "text" },
      { name: "Size", slug: "size", value: "29", department: "vmd", type: "text" },
      { name: "QTY/PCS", slug: "quantity", value: 5, department: "vmd", type: "number" },
      { name: "Color/Wash", slug: "color-wash", value: "Light Vintage Blue", department: "vmd", type: "text" },
      { name: "Fabric", slug: "fabric", value: "100% Cotton Denim", department: "vmd", type: "text" },
      { name: "Sample Raise Date", slug: "sample-raise-date", value: new Date("2025-11-28"), department: "vmd", type: "date" },
      { name: "ETD", slug: "etd", value: new Date("2026-01-05"), department: "vmd", type: "date" },
      { name: "Inquiry Status", slug: "inquiry-status", value: "Completed", department: "commercial", type: "text" },
      { name: "CU", slug: "cu", value: "CU-011", department: "commercial", type: "text" },
      { name: "Design Sketch", slug: "design-sketch", value: "/uploads/1762892192660-Screenshot-11_7_2025-9_40_30-PM.png", department: "cad", type: "image" },
      { name: "Fabric Swatch", slug: "fabric-swatch", value: "/uploads/1762799820990-OIP.webp", department: "vmd", type: "image" },
    ]
  },
  {
    refNo: "SRD-2025-012",
    title: "Coated Skinny Jeans",
    images: ["/uploads/1762257999997-fashion-trendy-womens-jeans-isolated-600nw-2466839305.webp"],
    createdBy: {
      id: "vmd@demo.com",
      name: "VMD Manager",
      role: "vmd"
    },
    status: {
      vmd: "approved",
      cad: "in-progress",
      commercial: "pending",
      mmc: "pending"
    },
    dynamicFields: [
      { name: "Brand", slug: "brand", value: "High Fashion Co.", department: "vmd", type: "text" },
      { name: "Sample Type", slug: "sample-type", value: "Proto", department: "vmd", type: "text" },
      { name: "Style", slug: "style", value: "HFC-2025-012", department: "vmd", type: "text" },
      { name: "Description", slug: "description", value: "Black coated skinny jeans with zipper details", department: "vmd", type: "text" },
      { name: "Size", slug: "size", value: "26", department: "vmd", type: "text" },
      { name: "QTY/PCS", slug: "quantity", value: 1, department: "vmd", type: "number" },
      { name: "Color/Wash", slug: "color-wash", value: "Black Coated", department: "vmd", type: "text" },
      { name: "Fabric", slug: "fabric", value: "Stretch Denim with Coating", department: "vmd", type: "text" },
      { name: "Sample Raise Date", slug: "sample-raise-date", value: new Date("2025-12-01"), department: "vmd", type: "date" },
      { name: "ETD", slug: "etd", value: new Date("2026-01-10"), department: "vmd", type: "date" },
      { name: "Inquiry Status", slug: "inquiry-status", value: "Pending Costing", department: "commercial", type: "text" },
      { name: "CU", slug: "cu", value: "CU-012", department: "commercial", type: "text" },
      { name: "Reference Image", slug: "reference-image", value: "/uploads/1762800918943-OIP.webp", department: "vmd", type: "image" },
    ]
  }
];