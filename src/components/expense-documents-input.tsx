import { Button } from '@/components/ui/button'
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ToastAction } from '@/components/ui/toast'
import { useToast } from '@/components/ui/use-toast'
import { randomId } from '@/lib/api'
import { ExpenseFormValues } from '@/lib/schemas'
import { formatFileSize } from '@/lib/utils'
import { Loader2, Plus, Trash, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { getImageData, usePresignedUpload } from 'next-s3-upload'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { supabaseS3UrlToPublicObjectUrl } from '@/lib/supabase-storage'

type Props = {
  groupId: string
  documents: ExpenseFormValues['documents']
  updateDocuments: (documents: ExpenseFormValues['documents']) => void
}

const MAX_FILE_SIZE = 5 * 1024 ** 2

export function ExpenseDocumentsInput({
  groupId,
  documents,
  updateDocuments,
}: Props) {
  const locale = useLocale()
  const t = useTranslations('ExpenseDocumentsInput')
  const [pending, setPending] = useState(false)
  const { uploadToS3 } = usePresignedUpload() // use presigned uploads to addtionally support providers other than AWS
  const { toast } = useToast()
  const captureInputRef = useRef<HTMLInputElement | null>(null)
  const [previewById, setPreviewById] = useState<Record<string, string>>(
    {},
  )

  const handleFileChange = async (files: File[]) => {
    const oversizedFile = files.find((file) => file.size > MAX_FILE_SIZE)
    if (oversizedFile) {
      toast({
        title: t('TooBigToast.title'),
        description: t('TooBigToast.description', {
          maxSize: formatFileSize(MAX_FILE_SIZE, locale),
          size: formatFileSize(oversizedFile.size, locale),
        }),
        variant: 'destructive',
      })
      return
    }

    const upload = async () => {
      let created: { id: string; file: File; previewUrl: string }[] = []
      try {
        setPending(true)
        created = files.map((file) => ({
          id: randomId(),
          file,
          previewUrl: URL.createObjectURL(file),
        }))

        setPreviewById((prev) => ({
          ...prev,
          ...Object.fromEntries(created.map((c) => [c.id, c.previewUrl])),
        }))

        const uploaded = await Promise.all(
          created.map(async ({ file, id }) => {
            const { width, height } = await getImageData(file)
            if (!width || !height) throw new Error('Cannot get image dimensions')
            const { url } = await uploadToS3(file, {
              endpoint: {
                request: {
                  body: { groupId },
                },
              },
            })
            const publicUrl = supabaseS3UrlToPublicObjectUrl(url)
            return { id, url: publicUrl, width, height }
          }),
        )
        updateDocuments([...documents, ...uploaded])
      } catch (err) {
        console.error(err)
        // Revoke previews created for this failed batch
        // (successful uploads keep previews so the UI renders instantly)
        if (created) {
          for (const c of created) URL.revokeObjectURL(c.previewUrl)
          setPreviewById((prev) => {
            const next = { ...prev }
            for (const c of created!) delete next[c.id]
            return next
          })
        }
        toast({
          title: t('ErrorToast.title'),
          description: t('ErrorToast.description'),
          variant: 'destructive',
          action: (
            <ToastAction
              altText={t('ErrorToast.retry')}
              onClick={() => upload()}
            >
              {t('ErrorToast.retry')}
            </ToastAction>
          ),
        })
      } finally {
        setPending(false)
      }
    }
    upload()
  }

  const deleteDocument = (document: ExpenseFormValues['documents'][number]) => {
    const previewUrl = previewById[document.id]
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewById((prev) => {
      const next = { ...prev }
      delete next[document.id]
      return next
    })
    updateDocuments(documents.filter((d) => d.id !== document.id))
  }

  return (
    <div>
      <input
        ref={captureInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          if (files.length > 0) handleFileChange(files)
          event.currentTarget.value = ''
        }}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 [&_*]:aspect-square">
        {documents.map((doc) => (
          <DocumentThumbnail
            key={doc.id}
            document={doc}
            documents={documents}
            getPreviewUrl={(id) => previewById[id]}
            deleteDocument={deleteDocument}
          />
        ))}

        <div>
          <Button
            variant="secondary"
            type="button"
            onClick={() => captureInputRef.current?.click()}
            className="w-full h-full"
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <Plus className="w-8 h-8" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function DocumentThumbnail({
  document,
  documents,
  deleteDocument,
  getPreviewUrl,
}: {
  document: ExpenseFormValues['documents'][number]
  documents: ExpenseFormValues['documents']
  deleteDocument: (document: ExpenseFormValues['documents'][number]) => void
  getPreviewUrl: (id: string) => string | undefined
}) {
  const [open, setOpen] = useState(false)
  const [api, setApi] = useState<CarouselApi>()
  const [currentDocument, setCurrentDocument] = useState<number | null>(null)

  useEffect(() => {
    if (!api) return

    api.on('slidesInView', () => {
      const index = api.slidesInView()[0]
      if (index !== undefined) {
        setCurrentDocument(index)
      }
    })
  }, [api])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          className="w-full h-full border overflow-hidden rounded shadow-inner"
        >
          <Image
            width={300}
            height={300}
            className="object-contain"
                src={
                  getPreviewUrl(document.id) ??
                  supabaseS3UrlToPublicObjectUrl(document.url)
                }
            alt=""
          />
        </Button>
      </DialogTrigger>
      <DialogContent className="p-4 w-[100vw] max-w-[100vw] h-[100dvh] max-h-[100dvh] sm:max-w-[calc(100vw-32px)] sm:max-h-[calc(100dvh-32px)] [&>:last-child]:hidden">
        <DialogTitle className="sr-only">Document</DialogTitle>
        <DialogDescription className="sr-only"></DialogDescription>
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={() => {
                if (currentDocument !== null) {
                  deleteDocument(documents[currentDocument])
                }
                setOpen(false)
              }}
            >
              <Trash className="w-4 h-4 mr-2" />
              Delete document
            </Button>
            <DialogClose asChild>
              <Button variant="ghost">
                <X className="w-4 h-4 mr-2" /> Close
              </Button>
            </DialogClose>
          </div>

          <Carousel
            opts={{
              startIndex: documents.indexOf(document),
              loop: true,
              align: 'center',
            }}
            setApi={setApi}
          >
            <CarouselContent>
              {documents.map((document, index) => (
                <CarouselItem key={index}>
                  <Image
                    className="object-contain w-[calc(100vw-32px)] h-[calc(100dvh-32px-40px-16px-48px)] sm:w-[calc(100vw-32px-32px)] sm:h-[calc(100dvh-32px-40px-16px-32px-48px)]"
                    src={
                      getPreviewUrl(document.id) ??
                      supabaseS3UrlToPublicObjectUrl(document.url)
                    }
                    width={document.width}
                    height={document.height}
                    alt=""
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-0 top-auto -bottom-16" />
            <CarouselNext className="right-0 top-auto -bottom-16" />
          </Carousel>
        </div>
      </DialogContent>
    </Dialog>
  )
}
