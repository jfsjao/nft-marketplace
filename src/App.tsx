import { CatalogPreview } from '@/features/catalog/CatalogPreview'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { TooltipProvider } from '@/components/ui/tooltip'

export default function DesignSystemPreview() {
  return (
    <TooltipProvider>
      <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-8 px-5 py-12 sm:px-8">
        <header className="space-y-3">
          <Badge variant="outline">Design system · T-01</Badge>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            NFT Marketplace
          </h1>
          <p className="max-w-xl text-muted-foreground">
            Base visual e componentes acessíveis para os próximos fluxos do
            marketplace.
          </p>
        </header>
        <CatalogPreview />
        <Card>
          <CardHeader>
            <CardTitle>Ações e estados</CardTitle>
            <CardDescription>
              Variantes, foco por teclado e controles desabilitados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <Button>Primário</Button>
              <Button variant="secondary">Secundário</Button>
              <Button variant="outline">Contorno</Button>
              <Button variant="ghost">Discreto</Button>
              <Button variant="destructive">Destrutivo</Button>
              <Button disabled>Desabilitado</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>Padrão</Badge>
              <Badge variant="secondary">Secundário</Badge>
              <Badge variant="outline">Contorno</Badge>
              <Badge variant="success">Sucesso</Badge>
              <Badge variant="warning">Atenção</Badge>
              <Badge variant="destructive">Erro</Badge>
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Campos e diálogo</CardTitle>
              <CardDescription>
                Labels explícitos e controle de foco.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="preview-input">Campo de exemplo</Label>
                <Input
                  id="preview-input"
                  placeholder="Digite para experimentar"
                />
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Abrir diálogo</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Componente de diálogo</DialogTitle>
                    <DialogDescription>
                      Use Tab para navegar e Escape para fechar. O foco retorna
                      ao botão de abertura.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button>Fechar diálogo</Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Carregamento</CardTitle>
              <CardDescription>
                Shimmer com respeito à preferência de movimento reduzido.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                role="status"
                aria-label="Exemplo de carregamento"
                className="space-y-3"
              >
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <span className="sr-only">Carregando conteúdo</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </TooltipProvider>
  )
}
