'use client'
import Layout from "@/components/layout/Layout";
import { Card } from "@/components/ui/card";
import { Settings, Building2, Workflow, FileText, Database, Landmark, List } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
    const settingsCards = [
        {
            title: "Departments",
            description: "Manage organizational departments and their configurations",
            icon: Building2,
            href: "/departments",
            color: "bg-blue-500"
        },
        {
            title: "Stages",
            description: "Configure workflow stages and their properties",
            icon: Workflow,
            href: "/stages",
            color: "bg-purple-500"
        },
        {
            title: "SRD Fields",
            description: "Customize fields for Sample Request & Development records",
            icon: FileText,
            href: "/srdfields",
            color: "bg-green-500"
        },
        {
            title: "Users",
            description: "Manage system users and permissions",
            icon: Settings,
            href: "/users",
            color: "bg-orange-500"
        },
        {
            title: "Production Stages",
            description: "Configure production workflow stages for approved SRDs",
            icon: Workflow,
            href: "/production-stages",
            color: "bg-red-500"
        },
        {
            title: "Production Tracking",
            description: "Monitor SRDs in production with stage tracking",
            icon: FileText,
            href: "/production",
            color: "bg-teal-500"
        },
        {
            title: "Backup Management",
            description: "Create, manage, and restore system backups",
            icon: Database,
            href: "/settings/backup",
            color: "bg-indigo-500"
        },
        {
            title: "Company",
            description: "Set company name and logo used in print cards",
            icon: Landmark,
            href: "/settings/company",
            color: "bg-yellow-500"
        },
        {
            title: "Pagination",
            description: "Control how many SRDs appear per page in table views",
            icon: List,
            href: "/settings/pagination",
            color: "bg-cyan-500"
        }
    ];

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center space-x-3">
                    <Settings className="h-8 w-8 text-gray-700" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
                        <p className="text-gray-600 mt-1">Configure and customize your SRD tracking system</p>
                    </div>
                </div>

                {/* Settings Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                    {settingsCards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <Link key={card.href} href={card.href}>
                                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-gray-300">
                                    <div className="flex items-start space-x-4">
                                        <div className={`${card.color} p-3 rounded-lg`}>
                                            <Icon className="h-6 w-6 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                                {card.title}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                {card.description}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        );
                    })}
                </div>

                {/* Stats Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                    <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-600 font-medium">Departments</p>
                                <p className="text-2xl font-bold text-blue-900 mt-1">Dynamic</p>
                            </div>
                            <Building2 className="h-8 w-8 text-blue-500" />
                        </div>
                    </Card>
                    <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-purple-600 font-medium">Workflow Stages</p>
                                <p className="text-2xl font-bold text-purple-900 mt-1">Customizable</p>
                            </div>
                            <Workflow className="h-8 w-8 text-purple-500" />
                        </div>
                    </Card>
                    <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-600 font-medium">Custom Fields</p>
                                <p className="text-2xl font-bold text-green-900 mt-1">Unlimited</p>
                            </div>
                            <FileText className="h-8 w-8 text-green-500" />
                        </div>
                    </Card>
                </div>

                {/* Info Section */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-blue-900 mb-2">Dynamic System Configuration</h2>
                    <p className="text-blue-800 mb-4">
                        Your SRD system is now fully dynamic and customizable. You can:
                    </p>
                    <ul className="space-y-2 text-blue-800">
                        <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>Create and manage departments without code changes</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>Define custom workflow stages with colors and icons</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>Add custom fields to SRD records for any department</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>All changes take effect immediately without deployment</span>
                        </li>
                    </ul>
                </div>

                {/* Quick Links */}
                <div className="mt-8 bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Start</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h3 className="font-medium text-gray-900 mb-2">📚 Documentation</h3>
                            <ul className="space-y-1 text-sm text-gray-600">
                                <li>• See QUICK_START_DYNAMIC.md for a 5-minute guide</li>
                                <li>• Read DYNAMIC_SYSTEM.md for full documentation</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900 mb-2">🚀 First Steps</h3>
                            <ul className="space-y-1 text-sm text-gray-600">
                                <li>• Run: npm run seed:dynamic</li>
                                <li>• Configure your departments and stages</li>
                                <li>• Add custom fields as needed</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
