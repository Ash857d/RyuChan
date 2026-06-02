import { motion } from 'motion/react'
import { useWriteStore } from '../stores/write-store'
import { INIT_DELAY } from '@/consts'
import { useRef } from 'react'

const defaultText = 'text'

export function WriteEditor() {
	const { form, updateForm, images, addFiles } = useWriteStore()
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const insertText = (text: string) => {
		const textarea = textareaRef.current
		if (!textarea) return

		textarea.focus()
		const success = document.execCommand('insertText', false, text)

		if (!success) {
			const { selectionStart, selectionEnd, value } = textarea
			const before = value.substring(0, selectionStart)
			const after = value.substring(selectionEnd)
			updateForm({ md: before + text + after })
			setTimeout(() => {
				textarea.setSelectionRange(selectionStart + text.length, selectionStart + text.length)
				textarea.focus()
			}, 0)
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		const textarea = textareaRef.current
		if (!textarea) return

		const { selectionStart, selectionEnd, value } = textarea
		const selectedText = value.substring(selectionStart, selectionEnd)

		if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
			e.preventDefault()
			const before = value.substring(0, selectionStart)
			const after = value.substring(selectionEnd)
			const isBold = before.endsWith('**') && after.startsWith('**')
			if (isBold && selectedText) {
				textarea.setSelectionRange(selectionStart - 2, selectionEnd + 2)
				insertText(selectedText)
			} else {
				const text = selectedText || defaultText
				insertText(`**${text}**`)
				if (!selectedText) {
					setTimeout(() => {
						textarea.setSelectionRange(selectionStart + 2, selectionStart + 2 + defaultText.length)
					}, 0)
				}
			}
			return
		}

		if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
			e.preventDefault()
			const before = value.substring(0, selectionStart)
			const after = value.substring(selectionEnd)
			const isItalic = before.endsWith('*') && after.startsWith('*') && !(before.endsWith('**') && after.startsWith('**'))
			if (isItalic && selectedText) {
				textarea.setSelectionRange(selectionStart - 1, selectionEnd + 1)
				insertText(selectedText)
			} else {
				const text = selectedText || defaultText
				insertText(`*${text}*`)
				if (!selectedText) {
					setTimeout(() => {
						textarea.setSelectionRange(selectionStart + 1, selectionStart + 1 + defaultText.length)
					}, 0)
				}
			}
			return
		}

		if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
			e.preventDefault()
			const text = selectedText || defaultText
			insertText(`[${text}](url)`)
			setTimeout(() => {
				const urlStart = selectionStart + text.length + 3
				textarea.setSelectionRange(urlStart, urlStart + 3)
			}, 0)
			return
		}

		if (e.key === 'Tab' && !e.shiftKey) {
			e.preventDefault()
			insertText('\t')
			return
		}

		if (e.key === 'Tab' && e.shiftKey) {
			e.preventDefault()
			const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
			const line = value.substring(lineStart, value.indexOf('\n', selectionStart))
			if (line.startsWith('\t')) {
				textarea.setSelectionRange(lineStart, lineStart + 1)
				insertText('')
			} else if (line.startsWith('  ')) {
				textarea.setSelectionRange(lineStart, lineStart + 2)
				insertText('')
			}
			return
		}
	}

	const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
		const items = e.clipboardData.items
		if (!items) return

		const imageFiles: File[] = []
		for (let i = 0; i < items.length; i++) {
			const item = items[i]
			if (item.type.startsWith('image/')) {
				const file = item.getAsFile()
				if (file) {
					imageFiles.push(file)
				}
			}
		}

		if (imageFiles.length > 0) {
			e.preventDefault()
			const resultImages = await addFiles(imageFiles).catch(() => [])
			if (resultImages && resultImages.length > 0) {
				const markdowns = resultImages.map(item => (item.type === 'url' ? `![](${item.url})` : `![](local-image:${item.id})`)).join('\n')
				insertText(markdowns)
			}
		}
	}

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ delay: INIT_DELAY }}
			className='bg-base-100 flex h-full w-full flex-col rounded-[40px] border border-base-200 p-8 shadow-xl overflow-y-auto min-h-0'
		>
			<div className='mb-4 flex flex-col md:flex-row gap-4 flex-shrink-0'>
				<input
					type='text'
					placeholder='标题'
					className='input input-bordered w-full md:flex-1 bg-base-100 focus:input-primary transition-all h-12 p-4 rounded-lg text-base font-medium'
					value={form.title}
					onChange={e => updateForm({ title: e.target.value })}
				/>
				<input
					type='text'
					placeholder='slug（xx-xx）'
					className='input input-bordered w-full md:w-[200px] bg-base-100 focus:input-primary transition-all h-12 p-4 rounded-lg text-base font-medium'
					value={form.slug}
					onChange={e => updateForm({ slug: e.target.value.toLowerCase() })}
				/>
			</div>
			<textarea
				ref={textareaRef}
				placeholder='Markdown 内容'
				className='textarea textarea-bordered w-full flex-1 min-h-0 resize-none rounded-2xl bg-base-100 p-6 text-base leading-relaxed focus:textarea-primary transition-all'
				value={form.md}
				onChange={e => updateForm({ md: e.target.value })}
				onKeyDown={handleKeyDown}
				onPaste={handlePaste}
			/>
		</motion.div>
	)
}
