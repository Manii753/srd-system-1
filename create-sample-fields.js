// Sample Fields Creation Script
// Run this with: node create-sample-fields.js

const sampleFields = {
  // VMD (Visual Merchandising & Design) Fields
  vmd: [
    // Basic Information Section
    { name: "Basic Information", type: "heading", order: 0 },
    { name: "Brand", type: "text", placeholder: "e.g., Fashion Co., Style Brand", isRequired: true, order: 1, parentHeading: "Basic Information" },
    { name: "Sample Type", type: "text", placeholder: "Proto, SMS, PP, Salesman", isRequired: true, order: 2, parentHeading: "Basic Information" },
    { name: "Style Code", type: "text", placeholder: "e.g., FC-2025-001", isRequired: true, order: 3, parentHeading: "Basic Information" },
    { name: "Style Description", type: "textarea", placeholder: "Detailed description of the garment style", isRequired: true, order: 4, parentHeading: "Basic Information" },
    { name: "Season", type: "text", placeholder: "SS25, AW25, etc.", order: 5, parentHeading: "Basic Information" },
    
    // Sample Details Section
    { name: "Sample Details", type: "heading", order: 6 },
    { name: "Size", type: "text", placeholder: "S, M, L, XL or 28, 30, 32", isRequired: true, order: 7, parentHeading: "Sample Details" },
    { name: "Quantity (PCS)", type: "number", placeholder: "Number of pieces required", isRequired: true, order: 8, parentHeading: "Sample Details" },
    { name: "Color/Wash", type: "text", placeholder: "Medium Blue, Stone Wash, Black", isRequired: true, order: 9, parentHeading: "Sample Details" },
    { name: "Fabric Type", type: "text", placeholder: "Denim, Cotton, Polyester blend", isRequired: true, order: 10, parentHeading: "Sample Details" },
    { name: "Fabric Code", type: "text", placeholder: "DNM-001, CTN-205", order: 11, parentHeading: "Sample Details" },
    { name: "Fabric Supplier", type: "text", placeholder: "Supplier name", order: 12, parentHeading: "Sample Details" },
    
    // Timeline Section
    { name: "Timeline", type: "heading", order: 13 },
    { name: "Sample Raise Date", type: "date", isRequired: true, order: 14, parentHeading: "Timeline" },
    { name: "Expected Delivery Date (ETD)", type: "date", isRequired: true, order: 15, parentHeading: "Timeline" },
    { name: "Urgency Level", type: "text", placeholder: "Normal, Urgent, Critical", order: 16, parentHeading: "Timeline" },
    
    // Construction Details Section
    { name: "Construction Details", type: "heading", order: 17 },
    { name: "Garment Construction", type: "text", placeholder: "5 Pocket, 3 Pocket, Shirt style", order: 18, parentHeading: "Construction Details" },
    { name: "Fly Details", type: "text", placeholder: "Zip Fly, Button Fly, No Fly", order: 19, parentHeading: "Construction Details" },
    { name: "Fly Opening Length", type: "text", placeholder: "18cm, 20cm", order: 20, parentHeading: "Construction Details" },
    { name: "Belt Loop Details", type: "text", placeholder: "5 loops, 6cm length", order: 21, parentHeading: "Construction Details" },
    { name: "Belt Loop Fusing", type: "boolean", placeholder: "Fusing required", order: 22, parentHeading: "Construction Details" },
    { name: "Waistband Fusing", type: "text", placeholder: "Light, Medium, Heavy grade", order: 23, parentHeading: "Construction Details" },
    
    // Seam & Attachment Details Section
    { name: "Seam & Attachment Details", type: "heading", order: 24 },
    { name: "Yoke Attachment", type: "text", placeholder: "Flat felled seam, Regular seam", order: 25, parentHeading: "Seam & Attachment Details" },
    { name: "Back Rise Attachment", type: "text", placeholder: "Double needle chain stitch", order: 26, parentHeading: "Seam & Attachment Details" },
    { name: "Inseam Attachment", type: "text", placeholder: "Safety stitch, Overlock", order: 27, parentHeading: "Seam & Attachment Details" },
    { name: "Side Seam Attachment", type: "text", placeholder: "Regular seam, French seam", order: 28, parentHeading: "Seam & Attachment Details" },
    
    // Wash & Finishing Section
    { name: "Wash & Finishing", type: "heading", order: 29 },
    { name: "Wash Comments", type: "textarea", placeholder: "Vintage effect with whiskers, Stone wash, Enzyme wash", order: 30, parentHeading: "Wash & Finishing" },
    { name: "Special Treatments", type: "textarea", placeholder: "Distressing, Embroidery, Prints", order: 31, parentHeading: "Wash & Finishing" },
    { name: "Costing Required", type: "boolean", placeholder: "Cost analysis needed", order: 32, parentHeading: "Wash & Finishing" },
    
    // Reference Images Section
    { name: "Reference Images", type: "heading", order: 33 },
    { name: "Style Reference Images", type: "image", placeholder: "Upload reference images", order: 34, parentHeading: "Reference Images" },
    { name: "Wash Reference Images", type: "image", placeholder: "Upload wash reference images", order: 35, parentHeading: "Reference Images" }
  ],

  // CAD (Computer-Aided Design) Fields
  cad: [
    // Technical Specifications Section
    { name: "Technical Specifications", type: "heading", order: 0 },
    { name: "Pattern Number", type: "text", placeholder: "PAT-2025-001", isRequired: true, order: 1, parentHeading: "Technical Specifications" },
    { name: "Fit Type", type: "text", placeholder: "Slim, Regular, Relaxed, Skinny", isRequired: true, order: 2, parentHeading: "Technical Specifications" },
    { name: "Size Range", type: "text", placeholder: "28-38, S-XXL", isRequired: true, order: 3, parentHeading: "Technical Specifications" },
    { name: "Base Size", type: "text", placeholder: "32, M", isRequired: true, order: 4, parentHeading: "Technical Specifications" },
    
    // Measurements Section
    { name: "Key Measurements", type: "heading", order: 5 },
    { name: "Waist (inches)", type: "number", placeholder: "Waist measurement", order: 6, parentHeading: "Key Measurements" },
    { name: "Hip (inches)", type: "number", placeholder: "Hip measurement", order: 7, parentHeading: "Key Measurements" },
    { name: "Inseam (inches)", type: "number", placeholder: "Inseam length", order: 8, parentHeading: "Key Measurements" },
    { name: "Outseam (inches)", type: "number", placeholder: "Outseam length", order: 9, parentHeading: "Key Measurements" },
    { name: "Front Rise (inches)", type: "number", placeholder: "Front rise measurement", order: 10, parentHeading: "Key Measurements" },
    { name: "Back Rise (inches)", type: "number", placeholder: "Back rise measurement", order: 11, parentHeading: "Key Measurements" },
    { name: "Thigh (inches)", type: "number", placeholder: "Thigh width", order: 12, parentHeading: "Key Measurements" },
    { name: "Knee (inches)", type: "number", placeholder: "Knee width", order: 13, parentHeading: "Key Measurements" },
    { name: "Leg Opening (inches)", type: "number", placeholder: "Bottom opening width", order: 14, parentHeading: "Key Measurements" },
    
    // Pattern Details Section
    { name: "Pattern Details", type: "heading", order: 15 },
    { name: "Number of Pattern Pieces", type: "number", placeholder: "Total pattern pieces", order: 16, parentHeading: "Pattern Details" },
    { name: "Grading Rules", type: "textarea", placeholder: "Size grading specifications", order: 17, parentHeading: "Pattern Details" },
    { name: "Seam Allowances", type: "text", placeholder: "1/2 inch, 3/8 inch", order: 18, parentHeading: "Pattern Details" },
    { name: "Notch Details", type: "textarea", placeholder: "Notch placement and specifications", order: 19, parentHeading: "Pattern Details" },
    
    // Technical Drawings Section
    { name: "Technical Drawings", type: "heading", order: 20 },
    { name: "Tech Pack Status", type: "text", placeholder: "Draft, In Progress, Complete", order: 21, parentHeading: "Technical Drawings" },
    { name: "CAD Files", type: "file", placeholder: "Upload CAD files", order: 22, parentHeading: "Technical Drawings" },
    { name: "Technical Sketches", type: "image", placeholder: "Upload technical drawings", order: 23, parentHeading: "Technical Drawings" },
    { name: "Measurement Charts", type: "image", placeholder: "Upload measurement charts", order: 24, parentHeading: "Technical Drawings" },
    
    // Revision History Section
    { name: "Revision History", type: "heading", order: 25 },
    { name: "Revision Number", type: "text", placeholder: "Rev 1.0, Rev 2.1", order: 26, parentHeading: "Revision History" },
    { name: "Last Modified Date", type: "date", order: 27, parentHeading: "Revision History" },
    { name: "Revision Notes", type: "textarea", placeholder: "Changes made in this revision", order: 28, parentHeading: "Revision History" }
  ],

  // Commercial Fields
  commercial: [
    // Business Information Section
    { name: "Business Information", type: "heading", order: 0 },
    { name: "Customer/Buyer", type: "text", placeholder: "Customer name", isRequired: true, order: 1, parentHeading: "Business Information" },
    { name: "Inquiry Number", type: "text", placeholder: "INQ-2025-001", isRequired: true, order: 2, parentHeading: "Business Information" },
    { name: "Inquiry Status", type: "text", placeholder: "New Inquiry, Under Review, Quoted", isRequired: true, order: 3, parentHeading: "Business Information" },
    { name: "Sales Representative", type: "text", placeholder: "Sales person name", order: 4, parentHeading: "Business Information" },
    { name: "Customer Unit (CU)", type: "text", placeholder: "CU-001, CU-BRAND-001", order: 5, parentHeading: "Business Information" },
    
    // Pricing & Costing Section
    { name: "Pricing & Costing", type: "heading", order: 6 },
    { name: "Target Price (USD)", type: "number", placeholder: "Target selling price", order: 7, parentHeading: "Pricing & Costing" },
    { name: "FOB Price (USD)", type: "number", placeholder: "Free on board price", order: 8, parentHeading: "Pricing & Costing" },
    { name: "CM Cost (USD)", type: "number", placeholder: "Cut and make cost", order: 9, parentHeading: "Pricing & Costing" },
    { name: "Fabric Cost (USD)", type: "number", placeholder: "Fabric cost per unit", order: 10, parentHeading: "Pricing & Costing" },
    { name: "Trim Cost (USD)", type: "number", placeholder: "Trims and accessories cost", order: 11, parentHeading: "Pricing & Costing" },
    { name: "Wash Cost (USD)", type: "number", placeholder: "Washing and finishing cost", order: 12, parentHeading: "Pricing & Costing" },
    
    // Order Details Section
    { name: "Order Details", type: "heading", order: 13 },
    { name: "Minimum Order Quantity", type: "number", placeholder: "MOQ in pieces", order: 14, parentHeading: "Order Details" },
    { name: "Expected Order Quantity", type: "number", placeholder: "Expected order size", order: 15, parentHeading: "Order Details" },
    { name: "Delivery Terms", type: "text", placeholder: "FOB, CIF, EXW", order: 16, parentHeading: "Order Details" },
    { name: "Payment Terms", type: "text", placeholder: "30% advance, 70% on shipment", order: 17, parentHeading: "Order Details" },
    { name: "Shipping Mode", type: "text", placeholder: "Sea, Air, Express", order: 18, parentHeading: "Order Details" },
    
    // Market Information Section
    { name: "Market Information", type: "heading", order: 19 },
    { name: "Target Market", type: "text", placeholder: "USA, Europe, Asia", order: 20, parentHeading: "Market Information" },
    { name: "Season/Collection", type: "text", placeholder: "Spring 2025, Holiday 2024", order: 21, parentHeading: "Market Information" },
    { name: "End Customer", type: "text", placeholder: "Retail chain, Brand", order: 22, parentHeading: "Market Information" },
    { name: "Competition Analysis", type: "textarea", placeholder: "Competitor pricing and features", order: 23, parentHeading: "Market Information" },
    
    // Compliance & Certifications Section
    { name: "Compliance & Certifications", type: "heading", order: 24 },
    { name: "Required Certifications", type: "textarea", placeholder: "OEKO-TEX, GOTS, BCI", order: 25, parentHeading: "Compliance & Certifications" },
    { name: "Testing Requirements", type: "textarea", placeholder: "Colorfastness, Shrinkage, etc.", order: 26, parentHeading: "Compliance & Certifications" },
    { name: "Sustainability Requirements", type: "textarea", placeholder: "Organic, Recycled content", order: 27, parentHeading: "Compliance & Certifications" }
  ],

  // MMC (Merchandising & Material Control) Fields
  mmc: [
    // Material Planning Section
    { name: "Material Planning", type: "heading", order: 0 },
    { name: "Fabric Consumption (meters)", type: "number", placeholder: "Fabric required per garment", isRequired: true, order: 1, parentHeading: "Material Planning" },
    { name: "Fabric Width (inches)", type: "number", placeholder: "Fabric width", isRequired: true, order: 2, parentHeading: "Material Planning" },
    { name: "Fabric GSM/Weight", type: "number", placeholder: "Fabric weight", order: 3, parentHeading: "Material Planning" },
    { name: "Fabric Composition", type: "text", placeholder: "100% Cotton, 98% Cotton 2% Elastane", isRequired: true, order: 4, parentHeading: "Material Planning" },
    { name: "Fabric Shrinkage %", type: "number", placeholder: "Expected shrinkage percentage", order: 5, parentHeading: "Material Planning" },
    
    // Trims & Accessories Section
    { name: "Trims & Accessories", type: "heading", order: 6 },
    { name: "Button Type", type: "text", placeholder: "Metal, Plastic, Horn", order: 7, parentHeading: "Trims & Accessories" },
    { name: "Button Quantity", type: "number", placeholder: "Number of buttons", order: 8, parentHeading: "Trims & Accessories" },
    { name: "Zipper Type", type: "text", placeholder: "Metal, Plastic, Invisible", order: 9, parentHeading: "Trims & Accessories" },
    { name: "Zipper Length (inches)", type: "number", placeholder: "Zipper length", order: 10, parentHeading: "Trims & Accessories" },
    { name: "Thread Consumption (meters)", type: "number", placeholder: "Thread required", order: 11, parentHeading: "Trims & Accessories" },
    { name: "Label Requirements", type: "textarea", placeholder: "Main label, Care label, Size label", order: 12, parentHeading: "Trims & Accessories" },
    { name: "Rivets/Hardware", type: "text", placeholder: "Copper rivets, Bartacks", order: 13, parentHeading: "Trims & Accessories" },
    
    // Costing Breakdown Section
    { name: "Costing Breakdown", type: "heading", order: 14 },
    { name: "Fabric Cost per Meter", type: "number", placeholder: "Cost per meter", order: 15, parentHeading: "Costing Breakdown" },
    { name: "Total Fabric Cost", type: "number", placeholder: "Total fabric cost per garment", order: 16, parentHeading: "Costing Breakdown" },
    { name: "Trims Cost", type: "number", placeholder: "Total trims cost", order: 17, parentHeading: "Costing Breakdown" },
    { name: "Labor Cost", type: "number", placeholder: "Manufacturing labor cost", order: 18, parentHeading: "Costing Breakdown" },
    { name: "Overhead Cost", type: "number", placeholder: "Factory overhead", order: 19, parentHeading: "Costing Breakdown" },
    
    // Supplier Information Section
    { name: "Supplier Information", type: "heading", order: 20 },
    { name: "Fabric Supplier", type: "text", placeholder: "Fabric mill name", order: 21, parentHeading: "Supplier Information" },
    { name: "Fabric Lead Time (days)", type: "number", placeholder: "Fabric delivery time", order: 22, parentHeading: "Supplier Information" },
    { name: "Trims Supplier", type: "text", placeholder: "Trims supplier name", order: 23, parentHeading: "Supplier Information" },
    { name: "Trims Lead Time (days)", type: "number", placeholder: "Trims delivery time", order: 24, parentHeading: "Supplier Information" },
    
    // Quality Control Section
    { name: "Quality Control", type: "heading", order: 25 },
    { name: "Fabric Quality Standards", type: "textarea", placeholder: "Quality requirements for fabric", order: 26, parentHeading: "Quality Control" },
    { name: "Inspection Points", type: "textarea", placeholder: "Key inspection checkpoints", order: 27, parentHeading: "Quality Control" },
    { name: "Defect Tolerance", type: "text", placeholder: "Acceptable defect levels", order: 28, parentHeading: "Quality Control" },
    
    // Production Planning Section
    { name: "Production Planning", type: "heading", order: 29 },
    { name: "Production Capacity (pcs/day)", type: "number", placeholder: "Daily production capacity", order: 30, parentHeading: "Production Planning" },
    { name: "Production Lead Time (days)", type: "number", placeholder: "Manufacturing time", order: 31, parentHeading: "Production Planning" },
    { name: "Efficiency %", type: "number", placeholder: "Expected production efficiency", order: 32, parentHeading: "Production Planning" },
    { name: "Critical Path Items", type: "textarea", placeholder: "Items that could delay production", order: 33, parentHeading: "Production Planning" }
  ]
};

async function createSampleFields() {
  const baseUrl = 'http://localhost:3000'; // Adjust if your app runs on different port
  
  console.log('Creating sample fields for all departments...\n');
  
  for (const [department, fields] of Object.entries(sampleFields)) {
    console.log(`Creating ${fields.length} fields for ${department.toUpperCase()} department...`);
    
    // Create headings first, then regular fields
    const headings = fields.filter(f => f.type === 'heading');
    const regularFields = fields.filter(f => f.type !== 'heading');
    
    // Create headings
    const headingMap = {};
    for (const heading of headings) {
      try {
        const response = await fetch(`${baseUrl}/api/newField`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...heading,
            department: department,
            active: true
          })
        });
        
        if (response.ok) {
          const createdHeading = await response.json();
          headingMap[heading.name] = createdHeading._id;
          console.log(`  ✓ Created heading: ${heading.name}`);
        } else {
          console.log(`  ✗ Failed to create heading: ${heading.name}`);
        }
      } catch (error) {
        console.log(`  ✗ Error creating heading ${heading.name}:`, error.message);
      }
    }
    
    // Create regular fields
    for (const field of regularFields) {
      try {
        const fieldData = {
          ...field,
          department: department,
          active: true
        };
        
        // Set parentHeading ID if it exists
        if (field.parentHeading && headingMap[field.parentHeading]) {
          fieldData.parentHeading = headingMap[field.parentHeading];
        }
        
        const response = await fetch(`${baseUrl}/api/newField`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fieldData)
        });
        
        if (response.ok) {
          console.log(`  ✓ Created field: ${field.name}`);
        } else {
          const error = await response.text();
          console.log(`  ✗ Failed to create field: ${field.name} - ${error}`);
        }
      } catch (error) {
        console.log(`  ✗ Error creating field ${field.name}:`, error.message);
      }
    }
    
    console.log(`Completed ${department.toUpperCase()} department\n`);
  }
  
  console.log('Sample fields creation completed!');
  console.log('\nSummary:');
  console.log(`- VMD: ${sampleFields.vmd.length} fields`);
  console.log(`- CAD: ${sampleFields.cad.length} fields`);
  console.log(`- Commercial: ${sampleFields.commercial.length} fields`);
  console.log(`- MMC: ${sampleFields.mmc.length} fields`);
  console.log(`Total: ${Object.values(sampleFields).flat().length} fields`);
}

// Run the script
createSampleFields().catch(console.error);