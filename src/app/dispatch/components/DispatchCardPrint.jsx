import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
const DispatchCardPrint = ({srd}) => {
    const [isPrinting, setIsPrinting]=useState(false)

    const handlePrint = async()=>{
        setIsPrinting(true)
        const res = await fetch('/api/dispatchCardFields')
        const { dispatchCardFields } = await res.json()
        console.log(dispatchCardFields)
        setIsPrinting(false)
    }
    return (
       <Button
            onClick={handlePrint}
            size="sm"
            variant="outline"
            className="h-6 px-2 py-0 text-xs bg-white text-blue-700 border-white hover:bg-blue-50"
            disabled={isPrinting}
          >
            {isPrinting ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Wait...
              </>
            ) : (
              <>
                <Printer className="h-3 w-3 mr-1" />
                Print Dispatch Card
              </>
            )}
          </Button>
    );
}

export default DispatchCardPrint;