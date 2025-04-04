import { TestBed } from '@angular/core/testing';

import { HelpCenterService } from './help-center.service';

describe('HelpCenterService', () => {
  let service: HelpCenterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HelpCenterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
