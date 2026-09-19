'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer } from 'lucide-react';
import { STAGE_FILTER_OPTIONS } from '@/lib/sampleFilters';

export default function SRDPrintDialog() {
    const [open, setOpen] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [status, setStatus] = useState('all');
    const [brand, setBrand] = useState('');
    const [sampleType, setSampleType] = useState('');
    const [stage, setStage] = useState('');
    const [brands, setBrands] = useState([]);
    const [sampleTypes, setSampleTypes] = useState([]);
    const [loading, setLoading] = useState(false);

    const handlePrint = () => {
        setLoading(true);

        // Construct query parameters
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (status && status !== 'all') params.append('completionStatus', status);
        if (brand) params.append('brand', brand);
        if (sampleType) params.append('sampleType', sampleType);
        if (stage) params.append('stage', stage);

        // Open print page in new tab
        const url = `/srd/print?${params.toString()}`;
        window.open(url, '_blank');

        setLoading(false);
        setOpen(false);
    };

    // set default dates (e.g. current month)
    const setDefaultDates = () => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(lastDay.toISOString().split('T')[0]);
    };

    const loadOptions = () => {
        fetch('/api/srd?listBrands=true')
            .then(r => r.json())
            .then(d => { if (d?.success && d.isBrandList) setBrands(d.data || []); })
            .catch(() => {});
        fetch('/api/srd?listSampleTypes=true')
            .then(r => r.json())
            .then(d => { if (d?.success) setSampleTypes(d.data || []); })
            .catch(() => {});
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (val) {
                if (!startDate) setDefaultDates();
                loadOptions();
            }
            setOpen(val);
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Printer className="h-4 w-4" />
                    Print Reports
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Print SRD Reports</DialogTitle>
                    <DialogDescription>
                        Select filters to generate a printable report of SRDs.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="start-date">Start Date</Label>
                            <input
                                id="start-date"
                                type="date"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-app-text ring-offset-background file:border-0 file:bg-transparent file:text-app-text file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="end-date">End Date</Label>
                            <input
                                id="end-date"
                                type="date"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-app-text ring-offset-background file:border-0 file:bg-transparent file:text-app-text file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="status">Completion Status</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger id="status">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="in-production">In Production</SelectItem>
                                <SelectItem value="pre-production">Pre-Production</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="brand">Brand</Label>
                        <Select value={brand} onValueChange={setBrand}>
                            <SelectTrigger id="brand">
                                <SelectValue placeholder="All brands" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">All Brands</SelectItem>
                                {brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="sample-type">Sample Type</Label>
                        <Select value={sampleType} onValueChange={setSampleType}>
                            <SelectTrigger id="sample-type">
                                <SelectValue placeholder="All sample types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">All Sample Types</SelectItem>
                                {sampleTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="stage">Stage</Label>
                        <Select value={stage} onValueChange={setStage}>
                            <SelectTrigger id="stage">
                                <SelectValue placeholder="All stages" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">All Stages</SelectItem>
                                {STAGE_FILTER_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handlePrint} disabled={loading}>
                        {loading ? 'Generating...' : 'Print Report'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
