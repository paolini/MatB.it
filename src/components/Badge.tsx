import React from "react"

export default function Badge({ active, children, onClick }: { active: boolean, children: React.ReactNode, onClick: () => void }) {
    return (
        <button
            className={`px-3 py-1 rounded-full border text-sm font-semibold transition-colors ${
                active ? 'bg-black text-white border-black' : 'bg-gray-100 text-gray-700 border-gray-300'
            }`}
            onClick={onClick}
        >
            {children}
        </button>
    )
}
