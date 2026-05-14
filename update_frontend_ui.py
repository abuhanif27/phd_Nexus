import re

with open('frontend/app/(protected)/prescription-analyzer/page.tsx', 'r') as f:
    code = f.read()

# 1. Update Preview Block for PDF
# Replace the file input and preview display logic
old_preview_block = r'\{preview \? \([\s\S]*?\) : \([\s\S]*?<Upload[\s\S]*?<\/div>\s*\)\}'

new_preview_block = """{preview ? (
                  <div className="absolute inset-0 w-full h-full p-2 bg-gray-50 dark:bg-gray-900 rounded">
                     {selectedFileObj?.name.toLowerCase().endsWith('.pdf') || selectedExistingFile?.filename.toLowerCase().endsWith('.pdf') ? (
                         <iframe src={preview} className="w-full h-full rounded border-0" title="PDF Preview" />
                     ) : (
                         <img src={preview} alt="Preview" className="object-contain w-full h-full rounded" />
                     )}
                     {!selectedExistingFile && (
                         <div className="absolute top-4 right-4 bg-white/90 backdrop-blur text-xs px-2 py-1 rounded shadow text-gray-700 font-medium z-20 pointer-events-none">
                            New Upload
                         </div>
                     )}
                  </div>
              ) : (
                  <div className="flex flex-col items-center pointer-events-none">
                    <Upload className="h-10 w-10 text-gray-400 mb-3" />
                    <p className="text-sm text-gray-600 font-medium">Click or drag prescription here</p>
                    <p className="text-xs text-gray-400 mt-1">Or select an existing document from above</p>
                  </div>
              )}"""

code = re.sub(old_preview_block, new_preview_block, code)


# 2. Add Purpose to medicines
old_meds_block = r'(<p className="text-xs text-gray-500 mt-0\.5">Dosage: \{med\.dosage\} for \{med\.duration_days\} days<\/p>\s*<\/div>)'
new_meds_block = r'\1\n                                            {med.purpose && <p className="text-xs text-blue-600/80 bg-blue-50/50 p-1.5 rounded mt-1.5 border border-blue-50"><strong className="font-semibold">Action/Purpose:</strong> {med.purpose}</p>}'
code = re.sub(old_meds_block, new_meds_block, code)


# 3. Add Doctor Advice Block and remove Raw Output
advice_and_cleanup = """
                    {/* Doctor's Advice Highlight */}
                    {(analyzeMutation.data as any).doctor_advice && (
                        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg shadow-sm">
                            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-500 flex items-center gap-2 mb-1.5">
                                💡 Doctor's Important Advice
                            </h3>
                            <p className="text-sm text-amber-900 dark:text-amber-400 italic">
                                "{(analyzeMutation.data as any).doctor_advice}"
                            </p>
                        </div>
                    )}
                 </div>
             )}

             {!analyzeMutation.isPending && !analyzeMutation.isSuccess && !analyzeMutation.isError && (
"""

code = re.sub(r'\{\/\* Raw Text \/ Entities \*\/\}.*?<\/div>\s*\)\}\s*<\/div>\s*\)\}\s*\{!analyzeMutation\.isPending', advice_and_cleanup, code, flags=re.DOTALL)

with open('frontend/app/(protected)/prescription-analyzer/page.tsx', 'w') as f:
    f.write(code)

print("Frontend UI Updated Successfully!")
