// Testes de api/ rodam em ambiente node (sem DOM); os da interface precisam das configurações de DOM.
if (typeof document !== 'undefined') await import('./setup.dom')
