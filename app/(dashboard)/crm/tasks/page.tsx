'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/shared/Header';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Calendar, 
  Plus, 
  Filter,
  MoreHorizontal,
  AlertCircle,
  Building2,
  X,
  Edit,
  Trash2,
  Copy,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { TaskPriority, TaskStatus } from '@/lib/types/enums';
import { safeText, safeLink } from '@/lib/utils/safe-helpers';
import { taskService } from '@/lib/services/tasks';
import { municipalityService, MunicipalityOption } from '@/lib/services/municipalities';
import { TaskDTO } from '@/lib/types/dtos';
import { useCompany } from '@/components/providers/CompanyProvider';
import EmptyState from '@/components/shared/EmptyState';

const initialTasks = [
  { id: '1', title: 'Enviar documentação para Pregão #452', account: 'Prefeitura de Curitiba', dueDate: '2023-10-25T10:00:00', priority: TaskPriority.HIGH, status: TaskStatus.PENDING },
  { id: '2', title: 'Reunião de alinhamento com Secretário', account: 'Prefeitura de São Paulo', dueDate: '2023-10-26T14:30:00', priority: TaskPriority.MEDIUM, status: TaskStatus.PENDING },
  { id: '3', title: 'Revisar proposta comercial - Lote 02', account: 'Governo do Estado do RJ', dueDate: '2023-10-24T17:00:00', priority: TaskPriority.HIGH, status: TaskStatus.COMPLETED },
  { id: '4', title: 'Ligar para pregoeiro sobre esclarecimento', account: 'Prefeitura de Campinas', dueDate: '2023-10-27T09:00:00', priority: TaskPriority.LOW, status: TaskStatus.PENDING },
  { id: '5', title: 'Preparar demonstração do sistema', account: 'Prefeitura de Osasco', dueDate: '2023-10-28T11:00:00', priority: TaskPriority.MEDIUM, status: TaskStatus.PENDING },
];

const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 5);

export default function TasksPage() {
  const { companyId } = useCompany();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [municipalities, setMunicipalities] = useState<MunicipalityOption[]>([]);
  const [activeTab, setActiveTab] = useState<TaskStatus>(TaskStatus.PENDING);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  
  const [newTask, setNewTask] = useState({ 
    title: '', 
    municipality_id: '', 
    due_date: '', 
    priority: TaskPriority.MEDIUM,
    description: ''
  });
  const [editingTask, setEditingTask] = useState<TaskDTO | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskDTO | null>(null);
  
  const [filters, setFilters] = useState({ priority: '' });

  const loadMunicipalities = useCallback(async () => {
    try {
      const munData = await municipalityService.getAllForSelect();
      setMunicipalities(munData);
    } catch (error) {
      console.error('Error loading municipalities:', error);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const tasksData = await taskService.getAll(companyId);
      setTasks(tasksData || []);
    } catch (error: any) {
      console.error('Error loading tasks:', error);
      const message = error?.message || error?.details || 'Erro ao carregar tarefas.';
      toast.error(`Erro: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadMunicipalities();
  }, [loadMunicipalities]);

  useEffect(() => {
    if (companyId) {
      loadTasks();
    }
  }, [companyId, loadTasks]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.municipality_id || !newTask.due_date) {
      toast.error('Por favor, preencha todos os campos.');
      return;
    }

    try {
      const created = await taskService.create({
        title: newTask.title,
        municipality_id: newTask.municipality_id,
        due_date: newTask.due_date,
        priority: newTask.priority,
        description: newTask.description,
        company_id: companyId!,
        status: TaskStatus.PENDING
      });

      setTasks([created, ...tasks]);
      setIsAddModalOpen(false);
      setNewTask({ 
        title: '', 
        municipality_id: '', 
        due_date: '', 
        priority: TaskPriority.MEDIUM,
        description: ''
      });
      toast.success('Tarefa agendada com sucesso!');
    } catch (error: any) {
      console.error('Error adding task:', error);
      const message = error?.message || error?.details || 'Erro ao agendar tarefa.';
      toast.error(`Erro: ${message}`);
    }
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    
    if (!editingTask.title || !editingTask.municipality_id || !editingTask.due_date) {
      toast.error('Por favor, preencha todos os campos.');
      return;
    }

    try {
      const updated = await taskService.update(editingTask.id, {
        title: editingTask.title,
        municipality_id: editingTask.municipality_id,
        due_date: editingTask.due_date,
        priority: editingTask.priority,
        description: editingTask.description,
        status: editingTask.status
      });
      setTasks(tasks.map(t => t.id === updated.id ? updated : t));
      setIsEditModalOpen(false);
      setEditingTask(null);
      toast.success('Tarefa atualizada!');
    } catch (error: any) {
      console.error('Error updating task:', error);
      const message = error?.message || error?.details || 'Erro ao atualizar tarefa.';
      toast.error(`Erro: ${message}`);
    }
  };

  const handleDeleteTask = async () => {
    if (!deletingTask) return;
    try {
      await taskService.delete(deletingTask.id);
      setTasks(tasks.filter(t => t.id !== deletingTask.id));
      setIsDeleteModalOpen(false);
      setDeletingTask(null);
      toast.success('Tarefa excluída!');
    } catch (error) {
      toast.error('Erro ao excluir tarefa.');
    }
  };

  const handleDuplicateTask = async (task: TaskDTO) => {
    try {
      const { id, created_at, updated_at, ...rest } = task;
      const duplicated = await taskService.create({
        ...rest,
        title: `${task.title} (Cópia)`,
        status: TaskStatus.PENDING
      });
      setTasks([duplicated, ...tasks]);
      toast.success('Tarefa duplicada!');
    } catch (error) {
      toast.error('Erro ao duplicar tarefa.');
    }
  };

  const toggleTaskStatus = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newStatus = task.status === TaskStatus.PENDING ? TaskStatus.COMPLETED : TaskStatus.PENDING;
    
    try {
      const updated = await taskService.update(id, { status: newStatus });
      setTasks(tasks.map(t => t.id === id ? updated : t));
      toast.success(newStatus === TaskStatus.COMPLETED ? 'Tarefa concluída!' : 'Tarefa reaberta.');
    } catch (error) {
      toast.error('Erro ao alterar status da tarefa.');
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesTab = t.status === activeTab;
    const matchesPriority = !filters.priority || t.priority === filters.priority;
    return matchesTab && matchesPriority;
  });

  const handleApplyFilters = () => {
    toast.success('Filtros aplicados!');
    setIsFilterModalOpen(false);
  };

  const handleResetFilters = () => {
    setFilters({ priority: '' });
    toast.info('Filtros limpos.');
  };

  return (
    <>
      <Header 
        title="Minhas Ações" 
        subtitle="Gerencie suas tarefas, compromissos e prazos de licitações." 
      />
      
      <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
              <button 
                onClick={() => setActiveTab(TaskStatus.PENDING)}
                className={cn(
                  "px-4 py-2 text-sm font-bold rounded-lg transition-all",
                  activeTab === TaskStatus.PENDING ? "bg-[#0f49bd] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
                )}
              >
                Pendentes
              </button>
              <button 
                onClick={() => setActiveTab(TaskStatus.COMPLETED)}
                className={cn(
                  "px-4 py-2 text-sm font-bold rounded-lg transition-all",
                  activeTab === TaskStatus.COMPLETED ? "bg-[#0f49bd] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
                )}
              >
                Concluídas
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsFilterModalOpen(true)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 bg-white"
              >
                <Filter className="size-5" />
              </button>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-[#0f49bd] px-4 py-2.5 text-white hover:bg-[#0a3690] transition-colors shadow-sm font-bold text-sm"
              >
                <Plus className="size-4" />
                Nova Tarefa
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="p-12 flex flex-col items-center justify-center text-center">
                  <Loader2 className="size-8 text-[#0f49bd] animate-spin mb-4" />
                  <p className="text-sm text-gray-500">Carregando tarefas...</p>
                </div>
              ) : filteredTasks.map((task) => (
                <div key={task.id} className="p-6 hover:bg-gray-50/50 transition-colors flex items-start gap-4 group">
                  <button 
                    onClick={() => toggleTaskStatus(task.id)}
                    className="mt-1 text-gray-300 hover:text-[#0f49bd] transition-colors"
                  >
                    {task.status === TaskStatus.COMPLETED ? (
                      <CheckCircle2 className="size-6 text-green-500" />
                    ) : (
                      <Circle className="size-6" />
                    )}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className={cn(
                        "text-base font-bold text-gray-900 truncate",
                        task.status === TaskStatus.COMPLETED && "line-through text-gray-400"
                      )}>
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={cn(
                          "text-[10px] font-bold uppercase px-2 py-0.5 rounded",
                          task.priority === TaskPriority.HIGH ? "bg-red-50 text-red-600" :
                          task.priority === TaskPriority.MEDIUM ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                        )}>
                          {task.priority}
                        </span>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-100">
                              <MoreHorizontal className="size-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingTask(task); setIsEditModalOpen(true); }}>
                              <Edit className="size-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateTask(task)}>
                              <Copy className="size-4 mr-2" /> Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleTaskStatus(task.id)}>
                              {task.status === TaskStatus.COMPLETED ? (
                                <><RotateCcw className="size-4 mr-2" /> Reabrir</>
                              ) : (
                                <><CheckCircle2 className="size-4 mr-2" /> Concluir</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => { setDeletingTask(task); setIsDeleteModalOpen(true); }}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="size-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                        <Building2 className="size-3.5" />
                        {task.account_name}
                      </div>
                      <div className={cn(
                        "flex items-center gap-1.5 text-xs font-bold",
                        new Date(task.due_date) < new Date() && task.status === TaskStatus.PENDING ? "text-red-600" : "text-gray-500"
                      )}>
                        <Clock className="size-3.5" />
                        {task.due_date ? formatDate(task.due_date) : 'Sem data'}
                      </div>
                    </div>
                    {task.description && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">{task.description}</p>
                    )}
                  </div>
                </div>
              ))}
              
              {!loading && filteredTasks.length === 0 && (
                <div className="p-12 flex flex-col items-center justify-center text-center">
                  <div className="size-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 mb-4">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Tudo em dia!</h3>
                  <p className="text-sm text-gray-500 mt-1">Você não tem tarefas {activeTab === TaskStatus.PENDING ? 'pendentes' : 'concluídas'} no momento.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Task Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Tarefa</DialogTitle>
            <DialogDescription>
              Atualize as informações desta tarefa ou compromisso.
            </DialogDescription>
          </DialogHeader>
          {editingTask && (
            <form onSubmit={handleEditTask} className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="edit-title" className="text-sm font-bold text-gray-700">O que precisa ser feito?</label>
                <input
                  id="edit-title"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-account" className="text-sm font-bold text-gray-700">Órgão / Prefeitura Relacionada</label>
                <select
                  id="edit-account"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editingTask.municipality_id}
                  onChange={(e) => setEditingTask({ ...editingTask, municipality_id: e.target.value })}
                >
                  <option value="">Selecione uma prefeitura...</option>
                  {municipalities.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-description" className="text-sm font-bold text-gray-700">Descrição / Notas</label>
                <textarea
                  id="edit-description"
                  rows={3}
                  className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd] resize-none"
                  placeholder="Detalhes adicionais sobre a tarefa..."
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-dueDate" className="text-sm font-bold text-gray-700">Prazo</label>
                  <input
                    id="edit-dueDate"
                    type="datetime-local"
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    value={editingTask.due_date.slice(0, 16)}
                    onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-priority" className="text-sm font-bold text-gray-700">Prioridade</label>
                  <select 
                    id="edit-priority"
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as TaskPriority })}
                  >
                    <option value={TaskPriority.LOW}>Baixa</option>
                    <option value={TaskPriority.MEDIUM}>Média</option>
                    <option value={TaskPriority.HIGH}>Alta</option>
                  </select>
                </div>
              </div>
              <DialogFooter className="pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all"
                >
                  Salvar Alterações
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a tarefa <span className="font-bold text-gray-900">{deletingTask?.title}</span>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 pt-4">
            <button 
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg"
            >
              Cancelar
            </button>
            <button 
              onClick={handleDeleteTask}
              className="flex-1 bg-red-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-red-700 shadow-sm transition-all"
            >
              Excluir
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
            <DialogDescription>
              Agende uma nova ação ou compromisso relacionado a um órgão público.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTask} className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-bold text-gray-700">O que precisa ser feito?</label>
              <input
                id="title"
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                placeholder="Ex: Enviar documentação técnica"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="account" className="text-sm font-bold text-gray-700">Órgão / Prefeitura Relacionada</label>
              <select
                id="account"
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                value={newTask.municipality_id}
                onChange={(e) => setNewTask({ ...newTask, municipality_id: e.target.value })}
              >
                <option value="">Selecione uma prefeitura...</option>
                {municipalities.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-bold text-gray-700">Descrição / Notas</label>
              <textarea
                id="description"
                rows={3}
                className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd] resize-none"
                placeholder="Detalhes adicionais sobre a tarefa..."
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="dueDate" className="text-sm font-bold text-gray-700">Prazo</label>
                <input
                  id="dueDate"
                  type="datetime-local"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="priority" className="text-sm font-bold text-gray-700">Prioridade</label>
                <select 
                  id="priority"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
                >
                  <option value={TaskPriority.LOW}>Baixa</option>
                  <option value={TaskPriority.MEDIUM}>Média</option>
                  <option value={TaskPriority.HIGH}>Alta</option>
                </select>
              </div>
            </div>
            <DialogFooter className="pt-4">
              <button 
                type="button" 
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all"
              >
                Agendar Tarefa
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Filter Modal */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filtrar Tarefas</DialogTitle>
            <DialogDescription>
              Refine a visualização das suas tarefas por prioridade.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Prioridade</label>
                <select 
                  className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value as TaskPriority })}
                >
                  <option value="">Todas as prioridades</option>
                  <option value={TaskPriority.HIGH}>Alta</option>
                  <option value={TaskPriority.MEDIUM}>Média</option>
                  <option value={TaskPriority.LOW}>Baixa</option>
                </select>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <button 
              onClick={handleResetFilters}
              className="flex-1 px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg"
            >
              Limpar
            </button>
            <button 
              onClick={handleApplyFilters}
              className="flex-1 bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all"
            >
              Aplicar Filtros
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
