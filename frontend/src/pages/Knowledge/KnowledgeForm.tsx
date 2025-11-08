import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save, X, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { knowledgeApi } from '@/lib/knowledge-api'
import { 
  KnowledgeCategory, 
  CATEGORY_LABELS,
  CreateKnowledgeEntryRequest,
  KnowledgeTemplate
} from '@/types/knowledge'

// Form validation schema
const knowledgeEntrySchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  category: z.enum(['MARKET_RESEARCH', 'COMPETITOR_ANALYSIS', 'CUSTOMER_INSIGHTS', 'LESSONS_LEARNED']),
  content: z.record(z.string()),
  tags: z.array(z.string()).default([]),
})

type KnowledgeEntryForm = z.infer<typeof knowledgeEntrySchema>

export default function KnowledgeForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const queryClient = useQueryClient()
  const isEditing = !!id

  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory | null>(null)
  const [tagInput, setTagInput] = useState('')

  // Fetch templates
  const { data: templatesData } = useQuery({
    queryKey: ['knowledge-templates'],
    queryFn: () => knowledgeApi.getTemplates(),
  })

  // Fetch entry for editing
  const { data: entryData, isLoading: isLoadingEntry } = useQuery({
    queryKey: ['knowledge', id],
    queryFn: () => knowledgeApi.getEntry(id!),
    enabled: isEditing,
  })

  const form = useForm<KnowledgeEntryForm>({
    resolver: zodResolver(knowledgeEntrySchema),
    defaultValues: {
      title: '',
      category: 'MARKET_RESEARCH',
      content: {},
      tags: [],
    },
  })

  const { watch, setValue, getValues } = form
  const watchedCategory = watch('category')
  const watchedTags = watch('tags')

  // Update form when editing entry is loaded
  useEffect(() => {
    if (entryData?.entry && isEditing) {
      const entry = entryData.entry
      form.reset({
        title: entry.title,
        category: entry.category,
        content: entry.content,
        tags: entry.tags,
      })
      setSelectedCategory(entry.category)
    }
  }, [entryData, isEditing, form])

  // Update selected category when form category changes
  useEffect(() => {
    setSelectedCategory(watchedCategory)
  }, [watchedCategory])

  // Get current template
  const currentTemplate = templatesData?.templates?.[selectedCategory || 'MARKET_RESEARCH']

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateKnowledgeEntryRequest) => knowledgeApi.createEntry(data),
    onSuccess: () => {
      toast.success('Knowledge entry created successfully')
      queryClient.invalidateQueries({ queryKey: ['knowledge'] })
      navigate('/knowledge')
    },
    onError: (error) => {
      toast.error(`Failed to create entry: ${error.message}`)
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: CreateKnowledgeEntryRequest) => knowledgeApi.updateEntry(id!, data),
    onSuccess: () => {
      toast.success('Knowledge entry updated successfully')
      queryClient.invalidateQueries({ queryKey: ['knowledge'] })
      navigate(`/knowledge/${id}`)
    },
    onError: (error) => {
      toast.error(`Failed to update entry: ${error.message}`)
    },
  })

  // Handle form submission
  const onSubmit = (data: KnowledgeEntryForm) => {
    if (!currentTemplate) return

    // Validate required fields
    const missingFields = Object.entries(currentTemplate.fields)
      .filter(([key, field]) => field.required && !data.content[key]?.trim())
      .map(([, field]) => field.label)

    if (missingFields.length > 0) {
      toast.error(`Please fill in required fields: ${missingFields.join(', ')}`)
      return
    }

    const payload: CreateKnowledgeEntryRequest = {
      title: data.title,
      category: data.category,
      content: data.content,
      tags: data.tags,
    }

    if (isEditing) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  // Handle adding tags
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !watchedTags.includes(tag)) {
      setValue('tags', [...watchedTags, tag])
      setTagInput('')
    }
  }

  // Handle removing tags
  const removeTag = (tagToRemove: string) => {
    setValue('tags', watchedTags.filter(tag => tag !== tagToRemove))
  }

  // Handle tag input key press
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  if (isEditing && isLoadingEntry) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? 'Edit Knowledge Entry' : 'Create Knowledge Entry'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Update your knowledge entry' : 'Add new insights to your knowledge base'}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter entry title..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tags */}
              <div className="space-y-2">
                <FormLabel>Tags</FormLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={handleTagKeyPress}
                  />
                  <Button type="button" onClick={addTag} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {watchedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {watchedTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Template Content */}
          {currentTemplate && (
            <Card>
              <CardHeader>
                <CardTitle>{currentTemplate.name} Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(currentTemplate.fields).map(([fieldKey, fieldConfig]) => (
                  <FormField
                    key={fieldKey}
                    control={form.control}
                    name={`content.${fieldKey}` as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {fieldConfig.label} {fieldConfig.required && '*'}
                        </FormLabel>
                        <FormControl>
                          {fieldConfig.type === 'textarea' ? (
                            <Textarea 
                              placeholder={`Enter ${fieldConfig.label.toLowerCase()}...`}
                              className="min-h-24"
                              {...field}
                            />
                          ) : (
                            <Input 
                              placeholder={`Enter ${fieldConfig.label.toLowerCase()}...`}
                              {...field}
                            />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Save className="mr-2 h-4 w-4" />
              {isEditing ? 'Update Entry' : 'Create Entry'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}