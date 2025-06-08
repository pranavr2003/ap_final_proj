"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner'

function extractNumber(input: string): string {
    console.log('extractNumber called');
    const match = input.match(/^[0-9]+(?:\.[0-9]+)?/);
    return match ? match[0] : "";
}

function classifyDialysisCase(params: any): string {
    console.log('classifyDialysisCase called with:', params);
    
    const extractedParams = {
        serumCreatinine: parseFloat(extractNumber(params.serumCreatinine)) || 0,
        urea: parseFloat(extractNumber(params.urea)) || 0,
        potassium: parseFloat(extractNumber(params.potassium)) || 0,
        bicarbonate: parseFloat(extractNumber(params.bicarbonate)) || 0,
        phosphorous: parseFloat(extractNumber(params.phosphorous)) || 0,
        urineProtein: extractNumber(params.urineProtein), // Keep as string
        sodium: parseFloat(extractNumber(params.sodium)) || 0,
        calcium: parseFloat(extractNumber(params.calcium)) || 0,
    };

    console.log('Processed parameters:', extractedParams);

    // Critical thresholds for "Dialysis Needed"
    // Only consider non-zero values (missing data should be ignored)
    const isCriticalCreatinine = extractedParams.serumCreatinine > 0 && extractedParams.serumCreatinine >= 5;
    const isCriticalUrea = extractedParams.urea > 0 && extractedParams.urea >= 100;
    const isCriticalPotassium = extractedParams.potassium > 0 && extractedParams.potassium > 5.5;
    const isCriticalAcidosis = extractedParams.bicarbonate > 0 && extractedParams.bicarbonate < 18;
    const isCriticalPhosphorous = extractedParams.phosphorous > 0 && extractedParams.phosphorous >= 7;
    const isCriticalElectrolytes = 
        (extractedParams.sodium > 0 && extractedParams.sodium < 125) || 
        (extractedParams.calcium > 0 && extractedParams.calcium < 8);

    // Borderline thresholds
    // Only consider non-zero values (missing data should be ignored)
    const isBorderlineCreatinine = extractedParams.serumCreatinine > 0 && extractedParams.serumCreatinine >= 3 && extractedParams.serumCreatinine < 5;
    const isBorderlineUrea = extractedParams.urea > 0 && extractedParams.urea >= 50 && extractedParams.urea < 100;
    const isBorderlinePotassium = extractedParams.potassium > 0 && extractedParams.potassium > 5.1 && extractedParams.potassium <= 5.5;
    const isBorderlineAcidosis = extractedParams.bicarbonate > 0 && extractedParams.bicarbonate >= 18 && extractedParams.bicarbonate < 22;
    const isBorderlinePhosphorous = extractedParams.phosphorous > 0 && extractedParams.phosphorous >= 5 && extractedParams.phosphorous < 7;
    const isProteinuria = parseFloat(extractedParams.urineProtein) >= 2;
    const isMildElectrolytes = 
        (extractedParams.sodium > 0 && extractedParams.sodium >= 125 && extractedParams.sodium < 136) || 
        (extractedParams.calcium > 0 && extractedParams.calcium >= 8 && extractedParams.calcium < 8.6);

    // Log all conditions for debugging
    console.log('Critical conditions:', {
        isCriticalCreatinine,
        isCriticalUrea,
        isCriticalPotassium,
        isCriticalAcidosis,
        isCriticalPhosphorous,
        isCriticalElectrolytes
    });
    
    console.log('Borderline conditions:', {
        isBorderlineCreatinine,
        isBorderlineUrea,
        isBorderlinePotassium,
        isBorderlineAcidosis,
        isBorderlinePhosphorous,
        isProteinuria,
        isMildElectrolytes
    });

    // Classification logic
    if (
        isCriticalCreatinine ||
        isCriticalUrea ||
        isCriticalPotassium ||
        isCriticalAcidosis ||
        isCriticalPhosphorous ||
        isCriticalElectrolytes
    ) {
        return "Dialysis Needed";
    } else if (
        isBorderlineCreatinine ||
        isBorderlineUrea ||
        isBorderlinePotassium ||
        isBorderlineAcidosis ||
        isBorderlinePhosphorous ||
        isProteinuria ||
        isMildElectrolytes
    ) {
        // Require at least two borderline markers
        const borderlineFlags = [
            isBorderlineCreatinine,
            isBorderlineUrea,
            isBorderlinePotassium,
            isBorderlineAcidosis,
            isBorderlinePhosphorous,
            isProteinuria,
            isMildElectrolytes
        ].filter(Boolean).length;

        return borderlineFlags >= 2 ? "Borderline Dialysis" : "No Dialysis, but regular follow-ups needed";
    }

    return "No Dialysis";
}

export default function Extract() {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [extractedData, setExtractedData] = useState<object | null>(null);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [result, setResult] = useState<string | null>(null);

    // please change this projectId to your own projectId. This can be generated from MongoDB's _id field in the projects collection.
    // It is unique for each project. Do a simple POST request to the /projects endpoint to get your own projectId.
    
    // const projectId = "6845355d5dc439504a0509a2"
    const projectId = "68453967e9779539d9694022"; //pranav id. THis will not work for you, please change it to your own projectId.
    // const projectId = "67db9b6691d535e654961116"; //pranav id. I have generated multiple only for testing purposes. 
    // const projectId = "67db9c1491d535e654961117"; //pranav id

    // Effect to run classification when extracted data changes
    useEffect(() => {
        if (extractedData) {
            console.log("Running classification with:", extractedData);
            const classificationResult = classifyDialysisCase(extractedData);
            console.log("Classification result:", classificationResult);
            setResult(classificationResult);
        }
    }, [extractedData]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        setError(null);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            await processFile(files[0]);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        const files = e.target.files;
        if (files?.length) {
            await processFile(files[0]);
        }
    };

    const processFile = async (file: File) => {
        setExtractedData(null);
        setResult(null);
        
        // Validate file type
        if (!file.type.includes('pdf') && !file.type.includes('image')) {
            setError('Please upload a PDF or image file');
            return;
        }

        setIsProcessing(true);

        try {
            const formData = new FormData();
            formData.append("file", file);
            
            const response = await fetch(`http://localhost:8000/extract?project_id=${encodeURIComponent(projectId)}`, {
                method: "POST",
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Failed to extract data from document');
            }
            
            const data = await response.json();
            console.log("Received extracted data:", data);
            setExtractedData(data);
            // The classification will happen in the useEffect
        } catch (err) {
            console.error("Error processing file:", err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        if (error) {
            toast.error(error);
        }
    }, [error]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">
                        Medical Document Information Extraction
                    </h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Upload your medical documents to automatically extract key information.
                        Supports PDF and image files.
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'} ${isProcessing ? 'opacity-50 pointer-events-none' : 'hover:border-blue-500'}`}
                    >
                        <div className="flex flex-col items-center gap-4 cursor-pointer" onClick={() => inputRef.current?.click()}>
                            <Upload className="w-12 h-12 text-gray-400" />
                            <div className="text-gray-600">
                                <p className="font-medium">
                                    Drag and drop your document here, or browse
                                </p>
                                <p className="text-sm text-gray-500 mt-2">
                                    Supports PDF and image files
                                </p>
                            </div>
                        </div>
                        <input
                            type="file"
                            className="hidden"
                            accept=".pdf,image/*"
                            onChange={handleFileSelect}
                            disabled={isProcessing}
                            ref={inputRef}
                        />
                    </div>
                </div>

                {isProcessing ? (
                    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                        <div className="flex items-center justify-center gap-3">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                            <span className="text-gray-600">Processing document...</span>
                        </div>
                    </div>
                ) : extractedData ? (
                    <div className="bg-white rounded-xl shadow-lg p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <CheckCircle className="w-6 h-6 text-green-500" />
                            <h2 className="text-xl font-semibold text-gray-900">
                                Extracted Information
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {Object.entries(extractedData).map(([key, value]) => (
                                <div key={key} className="border rounded-lg p-4">
                                    <p className="text-sm text-gray-500 mb-1 uppercase">
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </p>
                                    <p className="text-gray-900 font-medium">{value || "-"}</p>
                                </div>
                            ))}
                        </div>
                        {result && (
                            <div className="mt-6 p-4 text-lg rounded bg-blue-200 text-blue-800 border border-blue-800">
                                <p className="font-semibold">Dialysis Assessment:</p>
                                <p style={{ marginTop: '11px' }}>{result}</p>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
}