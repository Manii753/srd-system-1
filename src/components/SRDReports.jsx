'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Clock,
    Calendar,
    CheckCircle,
    Factory,
    History,
    Timer,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SRDReports({ srd }) {
    if (!srd) return null;

    const createdAt = new Date(srd.createdAt);
    const now = new Date();

    // Helper to format duration
    const formatDuration = (ms) => {
        if (!ms || ms < 0) return 'N/A';
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m`;
        return `${seconds}s`;
    };

    // Calculate Department Approval & Flag Times
    const departments = ['vmd', 'cad', 'mmc', 'commercial'];
    const deptStats = departments.map(dept => {
        const approvalAudit = srd.audit?.find(entry =>
            entry.action?.toLowerCase().includes(`approved by ${dept}`)
        );

        const flagAudits = srd.audit?.filter(entry =>
            entry.action?.toLowerCase().includes(`flagged issue in ${dept}`)
        ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        const latestFlag = flagAudits?.[0];

        // Find the comment from this department closest to the flag timestamp
        let flagComment = null;
        if (latestFlag && srd.comments) {
            const deptComments = srd.comments.filter(c =>
                String(c.department).toLowerCase() === String(dept).toLowerCase()
            );

            // Find comment closest to flag time (within 10 seconds)
            flagComment = deptComments.find(c =>
                Math.abs(new Date(c.date) - new Date(latestFlag.timestamp)) < 10000
            );

            // If no time-matched comment, get the most recent one for this dept
            if (!flagComment && deptComments.length > 0) {
                flagComment = deptComments.sort((a, b) =>
                    new Date(b.date) - new Date(a.date)
                )[0];
            }
        }

        let duration = null;
        let approvalDate = null;

        if (approvalAudit) {
            approvalDate = new Date(approvalAudit.timestamp);
            duration = approvalDate - createdAt;
        }

        return {
            name: dept.toUpperCase(),
            approved: srd.status?.[dept] === 'approved',
            flagged: srd.status?.[dept] === 'flagged',
            date: approvalDate,
            duration: duration,
            latestFlag: latestFlag ? {
                date: new Date(latestFlag.timestamp),
                comment: flagComment?.text || 'No comment provided'
            } : null
        };
    });
    // Calculate Production Stage Times
    const productionStages = srd.productionHistory || [];
    const prodStages = productionStages.map(stage => {
        const start = new Date(stage.startDate);
        const end = stage.endDate ? new Date(stage.endDate) : (stage.status === 'in-progress' ? now : null);
        const duration = end ? (end - start) : null;

        return {
            name: stage.stageDisplayName || stage.stageName || 'Unknown Stage',
            status: stage.status,
            start,
            end,
            duration
        };
    });

    // Calculate Overall Time
    const isComplete = srd.isComplete || (srd.inProduction && srd.productionProgress === 100);
    const overallEnd = isComplete && srd.productionEndDate ? new Date(srd.productionEndDate) : now;
    const overallDuration = overallEnd - createdAt;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-700 flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            SRD Raised
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900">
                            {createdAt.toLocaleDateString()}
                        </div>
                        <p className="text-xs text-blue-600 mt-1">
                            At {createdAt.toLocaleTimeString()}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-purple-50 border-purple-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-purple-700 flex items-center">
                            <Timer className="h-4 w-4 mr-2" />
                            Total Time Elapsed
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-900">
                            {formatDuration(overallDuration)}
                        </div>
                        <p className="text-xs text-purple-600 mt-1">
                            From creation {isComplete ? 'to completion' : 'to now'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-700 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-900 capitalize">
                            {isComplete ? 'Completed' : (srd.inProduction ? 'In Production' : 'Pre-Production')}
                        </div>
                        <p className="text-xs text-green-600 mt-1">
                            Overall Progress: {srd.progress}%
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Department Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center">
                        <History className="h-5 w-5 mr-2 text-gray-500" />
                        Department Efficiency
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {deptStats.map((dept, idx) => (
                            <div key={idx} className="border-b pb-4 last:border-0 last:pb-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className={cn(
                                            "w-2.5 h-2.5 rounded-full",
                                            dept.approved ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" :
                                                dept.flagged ? "bg-red-500 animate-pulse" : "bg-gray-300"
                                        )} />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-gray-900">{dept.name}</p>
                                                {dept.flagged && (
                                                    <Badge variant="destructive" className="text-[10px] py-0 h-4 uppercase">Flagged Issue</Badge>
                                                )}
                                                {dept.approved && (
                                                    <Badge className="bg-green-100 text-green-700 text-[10px] py-0 h-4 uppercase border-green-200">Approved</Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {dept.date ? `Approved on ${dept.date.toLocaleDateString()}` :
                                                    dept.flagged ? `Flagged on ${dept.latestFlag?.date.toLocaleDateString()}` :
                                                        'Pending approval'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900">
                                            {dept.approved ? formatDuration(dept.duration) :
                                                dept.flagged ? formatDuration(dept.latestFlag?.date - createdAt) :
                                                    formatDuration(now - createdAt)}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {dept.approved ? 'Time to approve' :
                                                dept.flagged ? 'Time until flagged' : 'Currently pending'}
                                        </p>
                                    </div>
                                </div>

                                {dept.latestFlag && (
                                    <div className={cn(
                                        "mt-2 p-3 rounded-lg text-sm",
                                        dept.flagged ? "bg-red-50 border border-red-100 text-red-700" : "bg-gray-50 text-gray-600"
                                    )}>
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <span className="font-bold mr-1">Flag Info:</span>
                                                {dept.latestFlag.comment}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Production Stage Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center">
                        <Factory className="h-5 w-5 mr-2 text-orange-500" />
                        Production Stage Durations
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {prodStages.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                            <Clock className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            <p>No production history yet</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {prodStages.map((stage, idx) => (
                                <div key={idx} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                                    <div className="flex items-center space-x-3">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            stage.status === 'completed' ? "bg-green-500" :
                                                stage.status === 'in-progress' ? "bg-blue-500 animate-pulse" : "bg-yellow-500"
                                        )} />
                                        <div>
                                            <p className="font-medium text-gray-900">{stage.name}</p>
                                            <Badge variant="outline" className="text-[10px] h-4 mt-0.5 uppercase">
                                                {stage.status}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900">{formatDuration(stage.duration)}</p>
                                        <p className="text-xs text-gray-400">Total spent</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
